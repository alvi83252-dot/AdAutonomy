import { complete, parseJSON } from '@/lib/llm/provider';
import { sendMessage } from '@/lib/agents/messaging';
import { withRetry } from '@/lib/agents/consensus';
import { updateAgentMemory } from '@/lib/storage/db';
import type { CampaignState, InvestorSummary } from '@/lib/types';

export async function runInvestorAgent(campaign: CampaignState): Promise<CampaignState> {
  const { result, confidence, usedFallback } = await withRetry(
    async () => {
      const prompt = `Generate investor summary (Seedcamp + Blue Wire Capital) for:
product: ${campaign.brief.productName}
simulation: ${JSON.stringify(campaign.simulation)}
payments: ${campaign.payments.length} transactions
Return JSON with totalSpend, projectedROI, breakEvenDays, riskScore (0-1), recommendation, highlights array.`;

      const response = await complete(prompt, { task: 'investor' });
      const summary = parseJSON<InvestorSummary>(response.content);

      await sendMessage('InvestorAgent', 'Orchestrator', 'response', { roi: summary.projectedROI }, response.confidence);

      return summary;
    },
    () => ({
      totalSpend: campaign.simulation ? campaign.simulation.clicks * (campaign.simulation.cpc || 1.5) : 5000,
      projectedROI: campaign.simulation?.roas ?? 2.5,
      breakEvenDays: 21,
      riskScore: 0.3,
      recommendation: 'Proceed with monitored rollout',
      highlights: ['Positive market signals', 'Diversified channel strategy'],
    }),
    'InvestorAgent'
  );

  updateAgentMemory('InvestorAgent', { confidence, notes: [usedFallback ? 'Fallback investor summary' : 'Investor report ready'] });

  return { ...campaign, investorSummary: result, currentStep: 8, updatedAt: new Date().toISOString() };
}
