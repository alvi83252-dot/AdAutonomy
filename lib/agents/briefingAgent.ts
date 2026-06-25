import { complete, parseJSON } from '@/lib/llm/provider';
import { sendMessage } from '@/lib/agents/messaging';
import { withRetry } from '@/lib/agents/consensus';
import { updateAgentMemory } from '@/lib/storage/db';
import type { CampaignState } from '@/lib/types';

export async function runBriefingAgent(campaign: CampaignState): Promise<CampaignState> {
  const { result, confidence, usedFallback } = await withRetry(
    async () => {
      const prompt = `Extract a structured campaign brief.
product: ${campaign.brief.productName}
market: ${campaign.brief.targetMarket}
goal: ${campaign.brief.campaignGoal}
Return JSON with summary, objectives, keyMessages, tone, constraints, budget, timeline.`;

      const response = await complete(prompt, { task: 'brief' });
      const extracted = parseJSON<Record<string, unknown>>(response.content);

      await sendMessage('BriefingAgent', 'Orchestrator', 'response', { extracted }, response.confidence);

      return extracted;
    },
    () => ({
      summary: `Campaign for ${campaign.brief.productName}`,
      objectives: [campaign.brief.campaignGoal],
      keyMessages: [`${campaign.brief.productName} delivers value`],
      tone: 'professional',
      constraints: ['Compliant messaging'],
      budget: 5000,
      timeline: '4 weeks',
    }),
    'BriefingAgent'
  );

  updateAgentMemory('BriefingAgent', {
    confidence,
    notes: [usedFallback ? 'Used fallback brief' : 'Brief extracted successfully'],
  });

  return {
    ...campaign,
    extractedBrief: result,
    currentStep: 1,
    status: 'running',
    updatedAt: new Date().toISOString(),
  };
}
