import { sendMessage } from '@/lib/agents/messaging';
import { withRetry } from '@/lib/agents/consensus';
import { updateAgentMemory } from '@/lib/storage/db';
import {
  createSimulationInput,
  hasModalEndpoint,
  runLocalSimulation,
  runModalSimulation,
} from '@/lib/modal/simulation';
import type { CampaignState } from '@/lib/types';

export async function runSimulationAgent(campaign: CampaignState): Promise<CampaignState> {
  const totalReach = campaign.audiences.reduce((sum, a) => sum + a.reach, 0);
  const avgCpc = campaign.audiences.length
    ? campaign.audiences.reduce((sum, a) => sum + a.costPerClick, 0) / campaign.audiences.length
    : 1.5;

  const input = createSimulationInput({
    campaignId: campaign.id,
    productName: campaign.brief.productName,
    totalReach,
    averageCpc: avgCpc,
    budget: campaign.brief.budget ?? 5000,
    creativeCount: campaign.creatives.length,
    channelCount: campaign.audiences.length,
  });

  const modalConfigured = hasModalEndpoint();
  const { result, confidence, usedFallback } = modalConfigured
    ? await withRetry(
        () => runModalSimulation(input),
        () => runLocalSimulation(input, 'Modal request failed after retry'),
        'SimulationAgent'
      )
    : {
        result: runLocalSimulation(input, 'Modal endpoint is not configured'),
        confidence: 0.75,
        usedFallback: true,
      };

  await sendMessage(
    'SimulationAgent',
    'InvestorAgent',
    'response',
    {
      roas: result.roas,
      computeProvider: result.compute?.provider ?? 'local',
      simulationRuns: result.compute?.runs ?? input.runs,
    },
    confidence
  );

  updateAgentMemory('SimulationAgent', {
    confidence,
    notes: [
      usedFallback
        ? `Local compute fallback (${result.compute?.runs ?? input.runs} runs)`
        : `Modal serverless compute (${result.compute?.runs ?? input.runs} runs)`,
    ],
  });

  return { ...campaign, simulation: result, currentStep: 4, updatedAt: new Date().toISOString() };
}
