import { saveCampaign } from '@/lib/storage/db';
import { sendMessage } from '@/lib/agents/messaging';
import { checkConsensus, addApproval } from '@/lib/agents/consensus';
import { runBriefingAgent } from '@/lib/agents/briefingAgent';
import { runCreativeAgent } from '@/lib/agents/creativeAgent';
import { runAudienceAgent } from '@/lib/agents/audienceAgent';
import { runSimulationAgent } from '@/lib/agents/simulationAgent';
import { runSafetyAgent } from '@/lib/agents/safetyAgent';
import { runFeedbackAgent } from '@/lib/agents/feedbackAgent';
import { runPaymentAgent } from '@/lib/agents/paymentAgent';
import { runInvestorAgent } from '@/lib/agents/investorAgent';
import { runDeploymentAgent } from '@/lib/agents/deploymentAgent';
import { createCampaignOrchestration } from '@/lib/manus/orchestration';
import { PIPELINE_STEPS } from '@/lib/pipeline';
import type { CampaignBrief, CampaignState } from '@/lib/types';
import { generateId, isDemoMode } from '@/lib/utils';

export { PIPELINE_STEPS } from '@/lib/pipeline';
export { getStepStatus } from '@/lib/pipeline';

export function createCampaign(brief: CampaignBrief): CampaignState {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    brief,
    creatives: [],
    audiences: [],
    safetyFlags: [],
    feedback: [],
    payments: [],
    approvals: [],
    status: 'pending',
    currentStep: 0,
    createdAt: now,
    updatedAt: now,
  };
}

type StepRunner = (campaign: CampaignState) => Promise<CampaignState>;

const STEP_RUNNERS: StepRunner[] = [
  runBriefingAgent,
  runCreativeAgent,
  runAudienceAgent,
  runSimulationAgent,
  runSafetyAgent,
  runFeedbackAgent,
  runPaymentAgent,
  runInvestorAgent,
  runDeploymentAgent,
];

export async function runPipeline(campaign: CampaignState): Promise<CampaignState> {
  let state: CampaignState = { ...campaign, status: 'running' };
  saveCampaign(state);

  const orchestration = await createCampaignOrchestration(state);
  state = { ...state, orchestration, updatedAt: new Date().toISOString() };
  saveCampaign(state);

  await sendMessage('Orchestrator', 'broadcast', 'info', {
    action: 'pipeline_start',
    campaignId: state.id,
    demoMode: isDemoMode(),
    orchestrationProvider: orchestration.provider,
    orchestrationTaskId: orchestration.taskId,
    executionStrategy: orchestration.executionStrategy,
  });

  for (let i = 0; i < STEP_RUNNERS.length; i++) {
    const step = PIPELINE_STEPS[i];
    const plannedStep = orchestration.steps.find((item) => item.stepId === step.id);
    try {
      await sendMessage('Orchestrator', step.agent, 'request', {
        step: step.id,
        index: i,
        objective: plannedStep?.objective,
        validation: plannedStep?.validation,
        priority: plannedStep?.priority,
      });
      state = await STEP_RUNNERS[i](state);
      saveCampaign(state);

      if (step.id === 'safety') {
        const consensus = checkConsensus(state.approvals);
        if (consensus.vetoed && !isDemoMode()) {
          state = { ...state, status: 'failed' };
          saveCampaign(state);
          await sendMessage('Orchestrator', 'broadcast', 'escalation', { reason: consensus.reason });
          return state;
        }
      }
    } catch (err) {
      console.error(`[Orchestrator] Step ${step.id} failed:`, err);
      await sendMessage('Orchestrator', step.agent, 'escalation', {
        step: step.id,
        error: (err as Error).message,
      });
      state = { ...state, status: 'failed' };
      saveCampaign(state);
      return state;
    }
  }

  state = addApproval(state, 'Orchestrator', true, 'Pipeline complete');
  state = { ...state, status: 'deployed' };
  saveCampaign(state);

  await sendMessage('Orchestrator', 'broadcast', 'approval', {
    action: 'pipeline_complete',
    campaignId: state.id,
  });

  return state;
}

export async function runSingleStep(campaign: CampaignState, stepIndex: number): Promise<CampaignState> {
  if (stepIndex < 0 || stepIndex >= STEP_RUNNERS.length) return campaign;
  const state = await STEP_RUNNERS[stepIndex](campaign);
  saveCampaign(state);
  return state;
}
