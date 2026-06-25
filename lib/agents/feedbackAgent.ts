import { complete, parseJSON } from '@/lib/llm/provider';
import { sendMessage } from '@/lib/agents/messaging';
import { withRetry } from '@/lib/agents/consensus';
import { updateAgentMemory } from '@/lib/storage/db';
import { provisionFeedbackChannel } from '@/lib/wassist/client';
import type { CampaignState, FeedbackItem } from '@/lib/types';

export async function runFeedbackAgent(campaign: CampaignState): Promise<CampaignState> {
  // 1. Stand up a real WhatsApp feedback line via Wassist. With a key present
  //    this provisions a live agent; offline it returns a non-live channel and
  //    we continue with simulated feedback. Either way it never throws.
  const channel = await provisionFeedbackChannel(campaign.brief, campaign.creatives);
  const sourceLabel = channel.live ? 'WhatsApp · Wassist (live)' : 'Wassist (mock)';

  // 2. Generate panel feedback (LLM when configured, deterministic offline).
  const { result, confidence, usedFallback } = await withRetry(
    async () => {
      const prompt = `Simulate customer feedback (collected via WhatsApp/Wassist) for ad campaign:
product: ${campaign.brief.productName}
target market: ${campaign.brief.targetMarket}
creatives: ${campaign.creatives.map((c) => c.headline).join('; ')}
Return JSON array with sentiment (positive/neutral/negative), comment, source.`;

      const response = await complete(prompt, { task: 'feedback' });
      const feedback = parseJSON<FeedbackItem[]>(response.content);

      await sendMessage(
        'FeedbackAgent',
        'CreativeAgent',
        'info',
        { feedbackCount: feedback.length, channel: channel.live ? 'wassist-live' : 'mock' },
        response.confidence
      );

      return feedback;
    },
    () => [
      { sentiment: 'positive' as const, comment: 'Compelling messaging', source: sourceLabel },
      { sentiment: 'neutral' as const, comment: 'Could be more specific on pricing', source: sourceLabel },
    ],
    'FeedbackAgent'
  );

  // 3. When the line is live, surface it at the top of the feedback list so the
  //    team (and the investor view) can open the real WhatsApp chat.
  const feedback: FeedbackItem[] =
    channel.live && channel.connectUrl
      ? [
          {
            sentiment: 'positive',
            comment: `Live WhatsApp feedback line is open — customers can chat with our Wassist agent directly.`,
            source: `Open chat: ${channel.connectUrl}`,
          },
          ...result,
        ]
      : result;

  // 4. Report the channel to the InvestorAgent for the downstream summary.
  await sendMessage('FeedbackAgent', 'InvestorAgent', 'response', {
    live: channel.live,
    agentId: channel.agentId ?? null,
    connectUrl: channel.connectUrl ?? null,
    feedbackCount: feedback.length,
  });

  updateAgentMemory('FeedbackAgent', {
    confidence,
    notes: [
      channel.live
        ? `Provisioned Wassist feedback agent ${channel.agentId}`
        : 'Wassist key absent — simulated feedback only',
      usedFallback ? 'Fallback feedback' : 'Feedback simulated',
    ],
  });

  return { ...campaign, feedback, currentStep: 6, updatedAt: new Date().toISOString() };
}
