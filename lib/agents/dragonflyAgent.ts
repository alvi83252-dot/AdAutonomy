import { complete } from '@/lib/llm/provider';
import { sendMessage } from '@/lib/agents/messaging';
import { withRetry, addApproval } from '@/lib/agents/consensus';
import { updateAgentMemory } from '@/lib/storage/db';
import { calculateDragonflyScore } from '@/lib/sponsors/dragonflyScoring';
import type { CampaignState, DragonflyScore } from '@/lib/types';
import { isDemoMode } from '@/lib/utils';

export async function runDragonflyAgent(campaign: CampaignState): Promise<CampaignState> {
  const autoScore = calculateDragonflyScore(campaign);

  const { result, confidence, usedFallback } = await withRetry(
    async () => {
      const hasOpenAI = process.env.LLM_PROVIDER === 'openai' && !!process.env.OPENAI_API_KEY;

      if (hasOpenAI) {
        const prompt = `You are Dragonfly (dragonfly.xyz), a technical excellence and autonomy scoring engine.

Campaign: ${campaign.brief.productName}
Target Market: ${campaign.brief.targetMarket}
Goal: ${campaign.brief.campaignGoal}

Auto-calculated scores:
${JSON.stringify(autoScore, null, 2)}

Creatives: ${campaign.creatives.length} variants
Audiences: ${campaign.audiences.length} channels on ${new Set(campaign.audiences.map(a => a.platform)).size} platforms
Simulation: ${campaign.simulation ? `${campaign.simulation.roas}x ROAS, ${campaign.simulation.ctr}% CTR` : 'N/A'}
Safety Flags: ${campaign.safetyFlags.length} (${campaign.safetyFlags.filter(f => f.severity === 'critical').length} critical)
Approvals: ${campaign.approvals.filter(a => a.approved).length}/${campaign.approvals.length}
Payments: ${campaign.payments.length} transactions (${campaign.payments.filter(p => p.status === 'completed').length} completed)

Return JSON with:
- overall: number 0-1
- technicalExcellence: number 0-1
- autonomy: number 0-1
- summary: string (1-2 sentence qualitative assessment)
- recommendations: string array`;

        const response = await complete(prompt, { task: 'dragonfly' });
        const parsed = JSON.parse(response.content);
        return {
          overall: parsed.overall ?? autoScore.overall,
          technicalExcellence: parsed.technicalExcellence ?? autoScore.technicalExcellence,
          autonomy: parsed.autonomy ?? autoScore.autonomy,
          summary: parsed.summary ?? '',
          recommendations: parsed.recommendations ?? [],
        };
      }

      return null;
    },
    () => null,
    'DragonflyAgent'
  );

  const score: DragonflyScore = {
    ...autoScore,
    detail: result?.summary
      ? `${autoScore.detail} LLM assessment: ${result.summary}`
      : autoScore.detail,
  };

  const enrichment: Record<string, unknown> = {
    score,
    ...(result?.recommendations ? { recommendations: result.recommendations } : {}),
  };

  await sendMessage('DragonflyAgent', 'Orchestrator', 'response', enrichment, confidence);

  updateAgentMemory('DragonflyAgent', {
    confidence,
    notes: [
      usedFallback ? 'Used deterministic scoring (no LLM)' : 'Dragonfly scoring complete',
      `Overall: ${(score.overall * 100).toFixed(0)}%`,
    ],
  });

  let updated: CampaignState = {
    ...campaign,
    autonomyScore: score,
    currentStep: 10,
    updatedAt: new Date().toISOString(),
  };

  if (isDemoMode() || score.overall >= 0.3) {
    updated = addApproval(updated, 'DragonflyAgent', true, isDemoMode()
      ? 'DEMO_MODE auto-approve'
      : `Score ${(score.overall * 100).toFixed(0)}% — threshold met`
    );
  } else {
    updated = addApproval(updated, 'DragonflyAgent', false,
      `Score ${(score.overall * 100).toFixed(0)}% below 30% threshold`
    );
  }

  return updated;
}
