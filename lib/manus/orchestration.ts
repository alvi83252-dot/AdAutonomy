import { PIPELINE_STEPS } from '@/lib/pipeline';
import type {
  CampaignState,
  ManusOrchestration,
  ManusPlanStep,
  ManusStructuredPlan,
} from '@/lib/types';

const API_BASE = process.env.MANUS_API_BASE || 'https://api.manus.ai';
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;

type ManusCreateTaskResponse = {
  ok: boolean;
  request_id?: string;
  task_id?: string;
  task_title?: string;
  task_url?: string;
  error?: { code?: string; message?: string };
};

type ManusEvent = {
  type?: string;
  assistant_message?: { content?: string };
  error_message?: { error_type?: string; content?: string };
  status_update?: {
    agent_status?: 'running' | 'stopped' | 'waiting' | 'error';
    brief?: string;
    description?: string;
    status_detail?: {
      waiting_for_event_type?: string;
      waiting_description?: string;
    };
  };
  structured_output_result?: {
    success?: boolean;
    value?: unknown;
    error?: string;
  };
  tool_used?: { tool?: string };
  plan_update?: { steps?: Array<{ title?: string }> };
};

type ManusMessagesResponse = {
  ok: boolean;
  request_id?: string;
  messages?: ManusEvent[];
  error?: { code?: string; message?: string };
};

export async function createCampaignOrchestration(
  campaign: CampaignState
): Promise<ManusOrchestration> {
  // Serverless hosts have short request limits — use local plan unless opted in.
  if (process.env.VERCEL === '1' && process.env.MANUS_ON_VERCEL !== 'true') {
    return createLocalOrchestration(campaign, 'Local orchestration (serverless fast path)');
  }

  if (
    process.env.MANUS_ORCHESTRATION_ENABLED !== 'true' ||
    !process.env.MANUS_API_KEY
  ) {
    return createLocalOrchestration(campaign, 'Manus API key is not configured');
  }

  const startedAt = Date.now();
  let taskId: string | undefined;
  let taskUrl: string | undefined;

  try {
    const created = await manusRequest<ManusCreateTaskResponse>('/v2/task.create', {
      method: 'POST',
      body: JSON.stringify({
        message: {
          content: orchestrationPrompt(campaign),
        },
        project_id: process.env.MANUS_PROJECT_ID || undefined,
        interactive_mode: false,
        hide_in_task_list: readBoolean(process.env.MANUS_HIDE_TASK, false),
        share_visibility: 'private',
        agent_profile: process.env.MANUS_AGENT_PROFILE || 'manus-1.6-lite',
        locale: 'en',
        title: `AdAutonomy orchestration: ${campaign.brief.productName}`,
        structured_output_schema: structuredPlanSchema,
      }),
    });

    if (!created.ok || !created.task_id) {
      throw new Error(apiError(created, 'Manus did not create the orchestration task'));
    }

    taskId = created.task_id;
    taskUrl = created.task_url;

    const completed = await pollTask(taskId);
    const plan = validateStructuredPlan(completed.plan);

    return {
      provider: 'manus',
      status: 'completed',
      taskId,
      taskUrl,
      requestId: completed.requestId ?? created.request_id,
      createdAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      summary: plan.summary,
      executionStrategy: plan.executionStrategy,
      riskCheckpoints: plan.riskCheckpoints,
      steps: plan.steps,
      toolsObserved: completed.toolsObserved,
    };
  } catch (error) {
    const fallback = createLocalOrchestration(campaign, (error as Error).message);
    return {
      ...fallback,
      taskId,
      taskUrl,
      latencyMs: Date.now() - startedAt,
    };
  }
}

async function pollTask(taskId: string): Promise<{
  plan: unknown;
  requestId?: string;
  toolsObserved: string[];
}> {
  const timeoutMs = readPositiveInteger(
    process.env.MANUS_TASK_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
    300_000
  );
  const pollIntervalMs = readPositiveInteger(
    process.env.MANUS_POLL_INTERVAL_MS,
    DEFAULT_POLL_INTERVAL_MS,
    10_000
  );
  const deadline = Date.now() + timeoutMs;
  const tools = new Set<string>();

  while (Date.now() < deadline) {
    const query = new URLSearchParams({
      task_id: taskId,
      order: 'desc',
      limit: '100',
      verbose: 'true',
    });
    const response = await manusRequest<ManusMessagesResponse>(
      `/v2/task.listMessages?${query.toString()}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error(apiError(response, 'Unable to read Manus task events'));
    }

    const messages = response.messages ?? [];
    for (const event of messages) {
      if (event.tool_used?.tool) tools.add(event.tool_used.tool);
      if (event.structured_output_result?.success && event.structured_output_result.value) {
        return {
          plan: event.structured_output_result.value,
          requestId: response.request_id,
          toolsObserved: Array.from(tools),
        };
      }
    }

    const latestStatus = messages.find((event) => event.type === 'status_update')?.status_update;
    if (latestStatus?.agent_status === 'waiting') {
      throw new Error(
        `Manus requested external input (${latestStatus.status_detail?.waiting_for_event_type ?? 'unknown'}): ${
          latestStatus.status_detail?.waiting_description ?? 'confirmation required'
        }`
      );
    }
    if (latestStatus?.agent_status === 'error') {
      const detail = messages.find((event) => event.error_message)?.error_message?.content;
      throw new Error(detail || 'Manus orchestration task failed');
    }
    if (latestStatus?.agent_status === 'stopped') {
      const detail = messages.find((event) => event.error_message)?.error_message?.content;
      throw new Error(detail || 'Manus completed without structured orchestration output');
    }

    await delay(pollIntervalMs);
  }

  throw new Error(`Manus orchestration timed out after ${timeoutMs}ms`);
}

async function manusRequest<T>(path: string, init: RequestInit): Promise<T> {
  const apiKey = process.env.MANUS_API_KEY;
  if (!apiKey) throw new Error('MANUS_API_KEY is not configured');

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-manus-api-key': apiKey,
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  const body = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !body) {
    throw new Error(`Manus API returned HTTP ${response.status}`);
  }
  return body;
}

function createLocalOrchestration(
  campaign: CampaignState,
  fallbackReason?: string
): ManusOrchestration {
  const steps: ManusPlanStep[] = PIPELINE_STEPS.map((step, index) => ({
    stepId: step.id,
    agent: step.agent,
    objective: localObjective(step.id, campaign),
    validation: localValidation(step.id),
    priority: index < 5 ? 'high' : index < 8 ? 'medium' : 'low',
  }));

  return {
    provider: 'local',
    status: 'fallback',
    createdAt: new Date().toISOString(),
    latencyMs: 0,
    summary: `Coordinate a full-funnel campaign for ${campaign.brief.productName} with deterministic agent handoffs and human-safe approval gates.`,
    executionStrategy:
      'Run dependency-ordered specialist agents, persist each checkpoint, stop on safety veto, and retain offline fallbacks.',
    riskCheckpoints: [
      'Validate campaign inputs before creative work',
      'Require compliance review before financial execution',
      'Stop external deployment when consensus is vetoed',
    ],
    steps,
    toolsObserved: [],
    fallbackReason,
  };
}

function validateStructuredPlan(value: unknown): ManusStructuredPlan {
  if (!value || typeof value !== 'object') throw new Error('Manus returned an invalid plan');
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.summary !== 'string' ||
    typeof candidate.executionStrategy !== 'string' ||
    !Array.isArray(candidate.riskCheckpoints) ||
    !Array.isArray(candidate.steps)
  ) {
    throw new Error('Manus plan is missing required fields');
  }

  const canonical = new Map(PIPELINE_STEPS.map((step) => [step.id, step]));
  const returned = new Map<string, ManusPlanStep>();

  for (const raw of candidate.steps) {
    if (!raw || typeof raw !== 'object') continue;
    const step = raw as Record<string, unknown>;
    const stepId = typeof step.stepId === 'string' ? step.stepId : '';
    const expected = canonical.get(stepId);
    if (!expected) continue;

    returned.set(stepId, {
      stepId,
      agent: expected.agent,
      objective:
        typeof step.objective === 'string' ? step.objective : localObjective(stepId),
      validation:
        typeof step.validation === 'string' ? step.validation : localValidation(stepId),
      priority: isPriority(step.priority) ? step.priority : 'medium',
    });
  }

  const steps = PIPELINE_STEPS.map((step) => {
    const planned = returned.get(step.id);
    if (!planned) throw new Error(`Manus plan omitted required step "${step.id}"`);
    return planned;
  });

  return {
    summary: candidate.summary,
    executionStrategy: candidate.executionStrategy,
    riskCheckpoints: candidate.riskCheckpoints.filter(
      (item): item is string => typeof item === 'string'
    ),
    steps,
  };
}

function orchestrationPrompt(campaign: CampaignState): string {
  const allowedSteps = PIPELINE_STEPS.map(
    (step) => `${step.id} (${step.agent}): ${step.label}`
  ).join('\n');

  return `You are the supervisory planner for AdAutonomy, an autonomous advertising company.
Create a concise execution plan for this campaign:
- Product: ${campaign.brief.productName}
- Target market: ${campaign.brief.targetMarket}
- Goal: ${campaign.brief.campaignGoal}
- Budget: ${campaign.brief.budget ?? 5000}
- Timeline: ${campaign.brief.timeline ?? '4 weeks'}

The executor is deterministic. Return every allowed step exactly once, in the exact order shown:
${allowedSteps}

For each step, define its objective, validation criterion, and priority.
Identify risk checkpoints and explain the overall execution strategy.
This is planning only. Do not browse, send messages, deploy, purchase, or request confirmation.`;
}

const structuredPlanSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    executionStrategy: { type: 'string' },
    riskCheckpoints: {
      type: 'array',
      items: { type: 'string' },
    },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          stepId: { type: 'string' },
          agent: { type: 'string' },
          objective: { type: 'string' },
          validation: { type: 'string' },
          priority: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
          },
        },
        required: ['stepId', 'agent', 'objective', 'validation', 'priority'],
        additionalProperties: false,
      },
    },
  },
  required: ['summary', 'executionStrategy', 'riskCheckpoints', 'steps'],
  additionalProperties: false,
};

function localObjective(stepId: string, campaign?: CampaignState): string {
  const product = campaign?.brief.productName ?? 'the campaign';
  const objectives: Record<string, string> = {
    brief: `Convert the request for ${product} into an actionable campaign brief`,
    creative: 'Generate distinct, channel-ready creative variants',
    audience: 'Select reachable audiences and cost-aware channels',
    simulation: 'Forecast performance and revenue with reproducible compute',
    safety: 'Review claims, language, privacy, and regulatory risks',
    feedback: 'Model customer response and identify improvement signals',
    payment: 'Execute simulated financial flows and spend controls',
    investor: 'Translate campaign evidence into an investor-ready assessment',
    deploy: 'Package approved outputs and deployment artifacts',
  };
  return objectives[stepId] ?? 'Complete the assigned specialist task';
}

function localValidation(stepId: string): string {
  const validations: Record<string, string> = {
    brief: 'Required fields and constraints are present',
    creative: 'At least three usable creative variants exist',
    audience: 'Channels include reach, CPC, and rationale',
    simulation: 'Forecast contains finite performance and revenue metrics',
    safety: 'No unresolved critical safety veto',
    feedback: 'Customer sentiments and sources are recorded',
    payment: 'Transactions reconcile with finance controls',
    investor: 'ROI, risk, break-even, and recommendation are present',
    deploy: 'Campaign pack and calendar export are generated',
  };
  return validations[stepId] ?? 'Output passes schema validation';
}

function apiError(
  response: { error?: { code?: string; message?: string } },
  fallback: string
): string {
  const message = response.error?.message;
  const code = response.error?.code;
  return message ? `${code ? `${code}: ` : ''}${message}` : fallback;
}

function isPriority(value: unknown): value is ManusPlanStep['priority'] {
  return value === 'high' || value === 'medium' || value === 'low';
}

function readPositiveInteger(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
