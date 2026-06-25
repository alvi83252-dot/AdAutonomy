import type { AgentName, ApprovalVote, CampaignState } from '@/lib/types';
import { isDemoMode } from '@/lib/utils';

const REQUIRED_APPROVALS = 3;

export function checkConsensus(votes: ApprovalVote[]): {
  approved: boolean;
  vetoed: boolean;
  reason: string;
} {
  const approvals = votes.filter((v) => v.approved);
  const vetoes = votes.filter((v) => !v.approved);

  if (vetoes.length > 0) {
    return { approved: false, vetoed: true, reason: `Vetoed by ${vetoes[0].agent}: ${vetoes[0].reason}` };
  }

  if (isDemoMode()) {
    return { approved: true, vetoed: false, reason: 'DEMO_MODE: auto-approved' };
  }

  if (approvals.length >= REQUIRED_APPROVALS) {
    return { approved: true, vetoed: false, reason: `Consensus reached (${approvals.length} approvals)` };
  }

  return {
    approved: false,
    vetoed: false,
    reason: `Awaiting approvals (${approvals.length}/${REQUIRED_APPROVALS})`,
  };
}

export function addApproval(
  campaign: CampaignState,
  agent: AgentName,
  approved: boolean,
  reason?: string
): CampaignState {
  const vote: ApprovalVote = {
    agent,
    approved,
    reason,
    timestamp: new Date().toISOString(),
  };

  return {
    ...campaign,
    approvals: [...campaign.approvals.filter((a) => a.agent !== agent), vote],
    updatedAt: new Date().toISOString(),
  };
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  fallback: () => T,
  agentName: string,
  maxRetries = 1
): Promise<{ result: T; confidence: number; usedFallback: boolean }> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return { result, confidence: 0.9, usedFallback: false };
    } catch (err) {
      lastError = err as Error;
      console.warn(`[${agentName}] Attempt ${attempt + 1} failed:`, lastError.message);
    }
  }

  console.warn(`[${agentName}] Using fallback after retries`);
  return { result: fallback(), confidence: 0.5, usedFallback: true };
}
