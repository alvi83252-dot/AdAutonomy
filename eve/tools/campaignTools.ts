import type { CampaignState } from '@/lib/types';

export async function runCampaignPipeline(campaign: CampaignState): Promise<CampaignState> {
  const { runPipeline } = await import('@/lib/orchestrator');
  return runPipeline(campaign);
}

export async function createCheckout(amount: number) {
  const { createCheckout } = await import('@/lib/agents/paymentAgent');
  return createCheckout(amount);
}

export async function generateTimeline(campaign: CampaignState) {
  const { generateICS } = await import('@/lib/calendar/icsGenerator');
  return generateICS(campaign);
}

export const tools = {
  runCampaignPipeline,
  createCheckout,
  generateTimeline,
};
