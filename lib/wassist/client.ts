import type { CampaignBrief, CreativeAsset } from '@/lib/types';

/**
 * Server-side Wassist client (WhatsApp AI agents).
 *
 * Follows the same offline-first contract as the rest of the platform: every
 * call degrades to a deterministic local fallback. A missing/blocked key never
 * throws and never breaks the pipeline — `provisionFeedbackChannel` simply
 * returns a non-live channel and the FeedbackAgent continues with mock data.
 *
 * Secrets are server-only. The API key is read from `WASSIST_API_KEY` and is
 * never exposed to the client (no NEXT_PUBLIC_ prefix).
 */

const WASSIST_BASE = process.env.WASSIST_API_BASE || 'https://backend.wassist.app/api/v1';
const REQUEST_TIMEOUT_MS = 8000;

export type WassistFeedbackChannel = {
  /** True only when a real agent was provisioned via the Wassist API. */
  live: boolean;
  /** The Wassist agent id (uuid), when live. */
  agentId?: string;
  /** Display name of the feedback agent. */
  agentName: string;
  /** wa.me click-to-chat deep link that opens the live feedback line. */
  connectUrl?: string;
};

/** Wassist is usable when a key is present and the feature flag isn't disabled. */
export function wassistEnabled(): boolean {
  return Boolean(process.env.WASSIST_API_KEY) && process.env.WASSIST_FEEDBACK_ENABLED !== 'false';
}

function apiKey(): string | null {
  return wassistEnabled() ? process.env.WASSIST_API_KEY ?? null : null;
}

/**
 * Thin fetch wrapper. Returns parsed JSON on success, `null` on any non-2xx,
 * timeout, or network error — callers decide how to degrade. Never throws.
 */
async function wassistFetch(
  key: string,
  path: string,
  init: { method: string; body?: unknown } = { method: 'GET' }
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${WASSIST_BASE}${path}`, {
      method: init.method,
      headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[Wassist] ${init.method} ${path} -> HTTP ${res.status}`);
      return null;
    }
    if (res.status === 204) return {};
    return (await res.json()) as Record<string, unknown>;
  } catch (err) {
    console.warn(`[Wassist] ${init.method} ${path} failed:`, (err as Error).message);
    return null;
  }
}

function buildSystemPrompt(brief: CampaignBrief, creatives: CreativeAsset[]): string {
  const headlines = creatives.map((c) => `- ${c.headline}`).join('\n') || '- (creatives pending)';
  return [
    `You are the customer-feedback agent for "${brief.productName}".`,
    `Target market: ${brief.targetMarket}. Campaign goal: ${brief.campaignGoal}.`,
    '',
    'Your job is to collect honest, concise reactions to these ad concepts:',
    headlines,
    '',
    'Keep replies short and friendly. Ask one question at a time, thank the',
    'person, and capture their sentiment (positive / neutral / negative) plus a',
    'one-line reason. Never make promises about price, delivery, or features.',
  ].join('\n');
}

function buildFirstMessage(brief: CampaignBrief): string {
  return `Hi! 👋 We're testing some new ideas for ${brief.productName} and would love 30 seconds of your honest feedback. Mind sharing your first impression?`;
}

const ICEBREAKERS = ['Love it', "It's okay", 'Not for me', 'Tell me more'];

/**
 * Stand up a live WhatsApp feedback line for the campaign.
 *
 * When a key is present: creates a Wassist agent, configures its persona, and
 * returns a real `connectUrl`. Configuration is best-effort — if the PATCH
 * fails the channel is still considered live (the agent exists and is
 * reachable). When no key is present or creation fails: returns a non-live
 * channel so the caller falls back to mock feedback.
 */
export async function provisionFeedbackChannel(
  brief: CampaignBrief,
  creatives: CreativeAsset[]
): Promise<WassistFeedbackChannel> {
  const agentName = `${brief.productName} — Feedback Line`;
  const key = apiKey();
  if (!key) return { live: false, agentName };

  const created = await wassistFetch(key, '/agents/', { method: 'POST', body: { name: agentName } });
  if (!created || typeof created.id !== 'string') return { live: false, agentName };
  const agentId = created.id;

  // Best-effort persona configuration; the live channel survives a failure here.
  await wassistFetch(key, `/agents/${agentId}/`, {
    method: 'PATCH',
    body: {
      systemPrompt: buildSystemPrompt(brief, creatives),
      firstMessage: buildFirstMessage(brief),
      icebreakers: ICEBREAKERS,
    },
  });

  return {
    live: true,
    agentId,
    agentName,
    connectUrl: typeof created.connectUrl === 'string' ? created.connectUrl : undefined,
  };
}
