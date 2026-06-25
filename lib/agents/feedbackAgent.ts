import { complete, parseJSON } from '@/lib/llm/provider';
import { sendMessage } from '@/lib/agents/messaging';
import { withRetry } from '@/lib/agents/consensus';
import { updateAgentMemory } from '@/lib/storage/db';
import type { CampaignState, FeedbackItem } from '@/lib/types';

export async function runFeedbackAgent(campaign: CampaignState): Promise<CampaignState> {
  const { result, confidence, usedFallback } = await withRetry(
    async () => {
      const prompt = `Simulate customer feedback (Wassist) for ad campaign:
product: ${campaign.brief.productName}
creatives: ${campaign.creatives.map((c) => c.headline).join('; ')}
Return JSON array with sentiment (positive/neutral/negative), comment, source.`;

      const response = await complete(prompt, { task: 'feedback' });
      const feedback = parseJSON<FeedbackItem[]>(response.content);

      await sendMessage('FeedbackAgent', 'CreativeAgent', 'info', { feedbackCount: feedback.length }, response.confidence);

      return feedback;
    },
    () => [
      { sentiment: 'positive' as const, comment: 'Compelling messaging', source: 'Wassist Mock' },
      { sentiment: 'neutral' as const, comment: 'Could be more specific on pricing', source: 'Survey' },
    ],
    'FeedbackAgent'
  );

  updateAgentMemory('FeedbackAgent', { confidence, notes: [usedFallback ? 'Fallback feedback' : 'Feedback simulated'] });

  return { ...campaign, feedback: result, currentStep: 6, updatedAt: new Date().toISOString() };
}
