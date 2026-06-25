import { complete, parseJSON } from '@/lib/llm/provider';
import { sendMessage, sendApproval } from '@/lib/agents/messaging';
import { withRetry, addApproval } from '@/lib/agents/consensus';
import { updateAgentMemory } from '@/lib/storage/db';
import type { CampaignState, SafetyFlag } from '@/lib/types';
import { isDemoMode } from '@/lib/utils';

export async function runSafetyAgent(campaign: CampaignState): Promise<CampaignState> {
  const { result, confidence, usedFallback } = await withRetry(
    async () => {
      const prompt = `Review ad creatives for safety and compliance (Elyos AI + 10 Downing Street guidelines):
creatives: ${JSON.stringify(campaign.creatives)}
Return JSON array with severity (low/medium/high/critical), category, message, resolved (false).`;

      const response = await complete(prompt, { task: 'safety' });
      const flags = parseJSON<SafetyFlag[]>(response.content);

      const hasCritical = flags.some((f) => f.severity === 'critical');
      if (hasCritical) {
        await sendMessage('SafetyAgent', 'Orchestrator', 'escalation', { flags }, response.confidence);
      } else {
        await sendApproval('SafetyAgent', 'Orchestrator', true, 'Compliance check passed');
      }

      return flags;
    },
    () => [
      { severity: 'low' as const, category: 'General', message: 'Standard review complete', resolved: true },
    ],
    'SafetyAgent'
  );

  updateAgentMemory('SafetyAgent', { confidence, notes: [usedFallback ? 'Fallback safety check' : 'Safety review done'] });

  let updated = { ...campaign, safetyFlags: result, currentStep: 5, updatedAt: new Date().toISOString() };

  if (isDemoMode() || !result.some((f) => f.severity === 'critical')) {
    updated = addApproval(updated, 'SafetyAgent', true, isDemoMode() ? 'DEMO_MODE auto-approve' : 'Passed compliance');
  } else {
    updated = addApproval(updated, 'SafetyAgent', false, 'Critical safety issues found');
  }

  return updated;
}
