import { complete, parseJSON } from '@/lib/llm/provider';
import { sendMessage } from '@/lib/agents/messaging';
import { withRetry } from '@/lib/agents/consensus';
import { updateAgentMemory } from '@/lib/storage/db';
import type { CampaignState, AudienceChannel } from '@/lib/types';

export async function runAudienceAgent(campaign: CampaignState): Promise<CampaignState> {
  const { result, confidence, usedFallback } = await withRetry(
    async () => {
      const prompt = `Select optimal advertising channels for:
product: ${campaign.brief.productName}
market: ${campaign.brief.targetMarket}
Return JSON array with name, platform, reach, costPerClick, rationale.`;

      const response = await complete(prompt, { task: 'audience' });
      const audiences = parseJSON<AudienceChannel[]>(response.content);

      await sendMessage('AudienceAgent', 'Orchestrator', 'response', { channels: audiences.length }, response.confidence);

      return audiences;
    },
    () => [
      { name: 'Google Ads', platform: 'Google', reach: 50000, costPerClick: 1.5, rationale: 'Search intent' },
      { name: 'Social Media', platform: 'Meta', reach: 100000, costPerClick: 0.9, rationale: 'Broad reach' },
    ],
    'AudienceAgent'
  );

  updateAgentMemory('AudienceAgent', { confidence, notes: [usedFallback ? 'Fallback channels' : 'Channels selected'] });

  return { ...campaign, audiences: result, currentStep: 3, updatedAt: new Date().toISOString() };
}
