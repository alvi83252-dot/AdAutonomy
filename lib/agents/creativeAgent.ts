import { complete, parseJSON } from '@/lib/llm/provider';
import { sendMessage } from '@/lib/agents/messaging';
import { withRetry } from '@/lib/agents/consensus';
import { updateAgentMemory } from '@/lib/storage/db';
import type { CampaignState, CreativeAsset } from '@/lib/types';

export async function runCreativeAgent(campaign: CampaignState): Promise<CampaignState> {
  const { result, confidence, usedFallback } = await withRetry(
    async () => {
      const prompt = `Generate 3 ad creative variants for:
product: ${campaign.brief.productName}
market: ${campaign.brief.targetMarket}
goal: ${campaign.brief.campaignGoal}
Return JSON array with headline, body, cta, variant, imagePrompt.`;

      const response = await complete(prompt, { task: 'creative' });
      const creatives = parseJSON<CreativeAsset[]>(response.content);

      await sendMessage('CreativeAgent', 'SafetyAgent', 'request', { creatives }, response.confidence);

      return creatives;
    },
    () => [
      {
        headline: `Discover ${campaign.brief.productName}`,
        body: `The smart choice for ${campaign.brief.targetMarket}.`,
        cta: 'Learn More',
        variant: 'A',
        imagePrompt: 'Product hero shot',
      },
    ],
    'CreativeAgent'
  );

  updateAgentMemory('CreativeAgent', { confidence, notes: [usedFallback ? 'Fallback creatives' : 'Creatives generated'] });

  return { ...campaign, creatives: result, currentStep: 2, updatedAt: new Date().toISOString() };
}
