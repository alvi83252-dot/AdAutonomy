import { complete, parseJSON } from '@/lib/llm/provider';
import { sendMessage } from '@/lib/agents/messaging';
import { withRetry } from '@/lib/agents/consensus';
import { updateAgentMemory } from '@/lib/storage/db';
import type { CampaignState, SimulationResult } from '@/lib/types';

export async function runSimulationAgent(campaign: CampaignState): Promise<CampaignState> {
  const totalReach = campaign.audiences.reduce((sum, a) => sum + a.reach, 0);
  const avgCpc = campaign.audiences.length
    ? campaign.audiences.reduce((sum, a) => sum + a.costPerClick, 0) / campaign.audiences.length
    : 1.5;

  const { result, confidence, usedFallback } = await withRetry(
    async () => {
      const prompt = `Simulate campaign performance for:
product: ${campaign.brief.productName}
channels: ${campaign.audiences.map((a) => a.platform).join(', ')}
total reach: ${totalReach}
avg CPC: ${avgCpc}
Return JSON with impressions, clicks, conversions, ctr, cpc, roas, projectedRevenue.`;

      const response = await complete(prompt, { task: 'simulation' });
      const simulation = parseJSON<SimulationResult>(response.content);

      await sendMessage('SimulationAgent', 'InvestorAgent', 'response', { roas: simulation.roas }, response.confidence);

      return simulation;
    },
    () => ({
      impressions: totalReach * 2,
      clicks: Math.round(totalReach * 0.03),
      conversions: Math.round(totalReach * 0.0015),
      ctr: 3.0,
      cpc: avgCpc,
      roas: 2.8,
      projectedRevenue: 15000,
    }),
    'SimulationAgent'
  );

  updateAgentMemory('SimulationAgent', { confidence, notes: [usedFallback ? 'Fallback simulation' : 'Simulation complete'] });

  return { ...campaign, simulation: result, currentStep: 4, updatedAt: new Date().toISOString() };
}
