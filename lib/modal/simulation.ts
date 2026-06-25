import type { SimulationResult } from '@/lib/types';

export type ModalSimulationInput = {
  campaignId: string;
  productName: string;
  totalReach: number;
  averageCpc: number;
  budget: number;
  creativeCount: number;
  channelCount: number;
  runs: number;
};

type ModalSimulationResponse = Omit<SimulationResult, 'compute'> & {
  requestId?: string;
};

const DEFAULT_RUNS = 5000;
const DEFAULT_TIMEOUT_MS = 20_000;

export function createSimulationInput(input: Omit<ModalSimulationInput, 'runs'>): ModalSimulationInput {
  return {
    ...input,
    totalReach: Math.max(1, Math.round(input.totalReach)),
    averageCpc: Math.max(0.01, input.averageCpc),
    budget: Math.max(1, input.budget),
    creativeCount: Math.max(1, input.creativeCount),
    channelCount: Math.max(1, input.channelCount),
    runs: readPositiveInteger(process.env.MODAL_SIMULATION_RUNS, DEFAULT_RUNS, 100_000),
  };
}

export function hasModalEndpoint(): boolean {
  return process.env.MODAL_SIMULATION_ENABLED === 'true' && Boolean(process.env.MODAL_SIMULATION_URL);
}

export async function runModalSimulation(input: ModalSimulationInput): Promise<SimulationResult> {
  const endpoint = process.env.MODAL_SIMULATION_URL;
  if (!endpoint) throw new Error('MODAL_SIMULATION_URL is not configured');

  const timeoutMs =
    process.env.VERCEL === '1'
      ? Math.min(
          readPositiveInteger(process.env.MODAL_REQUEST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 120_000),
          8_000
        )
      : readPositiveInteger(process.env.MODAL_REQUEST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 120_000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...modalAuthHeaders(),
      },
      body: JSON.stringify(input),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`Modal returned ${response.status}${detail ? `: ${detail}` : ''}`);
    }

    const result = validateModalResponse((await response.json()) as unknown);
    return {
      ...result,
      compute: {
        provider: 'modal',
        runs: input.runs,
        latencyMs: Date.now() - startedAt,
        requestId: result.requestId,
      },
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error(`Modal simulation timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function runLocalSimulation(
  input: ModalSimulationInput,
  fallbackReason?: string
): SimulationResult {
  const startedAt = Date.now();
  const random = mulberry32(hashString(`${input.campaignId}:${input.productName}`));
  let impressionsTotal = 0;
  let clicksTotal = 0;
  let conversionsTotal = 0;
  let revenueTotal = 0;

  const creativeLift = Math.min(0.3, Math.max(0, input.creativeCount - 1) * 0.045);
  const channelLift = Math.min(0.22, Math.max(0, input.channelCount - 1) * 0.035);
  const baseCtr = 0.018 * (1 + creativeLift + channelLift);
  const baseConversionRate = 0.045 * (1 + creativeLift * 0.5);
  const averageOrderValue = Math.max(35, input.averageCpc * 28);

  for (let run = 0; run < input.runs; run++) {
    const ctr = clamp(baseCtr * (1 + gaussian(random) * 0.18), 0.003, 0.12);
    const conversionRate = clamp(
      baseConversionRate * (1 + gaussian(random) * 0.22),
      0.005,
      0.25
    );
    const cpc = Math.max(0.05, input.averageCpc * (1 + gaussian(random) * 0.12));
    const affordableClicks = input.budget / cpc;
    const availableImpressions = input.totalReach * (1.65 + random() * 0.7);
    const impressions = Math.min(availableImpressions, affordableClicks / ctr);
    const clicks = impressions * ctr;
    const conversions = clicks * conversionRate;

    impressionsTotal += impressions;
    clicksTotal += clicks;
    conversionsTotal += conversions;
    revenueTotal += conversions * averageOrderValue * (0.9 + random() * 0.2);
  }

  const impressions = Math.max(1, Math.round(impressionsTotal / input.runs));
  const clicks = Math.max(0, Math.round(clicksTotal / input.runs));
  const conversions = Math.max(0, Math.round(conversionsTotal / input.runs));
  const projectedRevenue = Math.max(0, Math.round(revenueTotal / input.runs));
  const spend = Math.min(input.budget, clicks * input.averageCpc);

  return {
    impressions,
    clicks,
    conversions,
    ctr: round((clicks / impressions) * 100, 2),
    cpc: round(spend / Math.max(1, clicks), 2),
    roas: round(projectedRevenue / Math.max(1, spend), 2),
    projectedRevenue,
    compute: {
      provider: 'local',
      runs: input.runs,
      latencyMs: Date.now() - startedAt,
      fallbackReason,
    },
  };
}

function modalAuthHeaders(): Record<string, string> {
  const key = process.env.MODAL_PROXY_KEY;
  const secret = process.env.MODAL_PROXY_SECRET;
  if (!key || !secret) return {};
  return { 'Modal-Key': key, 'Modal-Secret': secret };
}

function validateModalResponse(value: unknown): ModalSimulationResponse {
  if (!value || typeof value !== 'object') {
    throw new Error('Modal returned an invalid JSON response');
  }

  const response = value as Record<string, unknown>;
  const numberFields = [
    'impressions',
    'clicks',
    'conversions',
    'ctr',
    'cpc',
    'roas',
    'projectedRevenue',
  ] as const;

  for (const field of numberFields) {
    if (typeof response[field] !== 'number' || !Number.isFinite(response[field])) {
      throw new Error(`Modal response is missing numeric field "${field}"`);
    }
  }

  return {
    impressions: Math.max(0, Math.round(response.impressions as number)),
    clicks: Math.max(0, Math.round(response.clicks as number)),
    conversions: Math.max(0, Math.round(response.conversions as number)),
    ctr: round(response.ctr as number, 2),
    cpc: round(response.cpc as number, 2),
    roas: round(response.roas as number, 2),
    projectedRevenue: Math.max(0, Math.round(response.projectedRevenue as number)),
    requestId: typeof response.requestId === 'string' ? response.requestId : undefined,
  };
}

function readPositiveInteger(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(random: () => number): number {
  const u = Math.max(Number.EPSILON, random());
  const v = Math.max(Number.EPSILON, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
