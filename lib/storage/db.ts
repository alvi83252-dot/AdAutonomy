import fs from 'fs';
import path from 'path';
import type { CampaignState, AgentMessage, AgentMemory } from '@/lib/types';

function resolveDataDir(): string {
  if (process.env.ADAUTONOMY_DATA_DIR) {
    return process.env.ADAUTONOMY_DATA_DIR;
  }
  // Vercel/Lambda only allow writes under /tmp
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'adautonomy-data');
  }
  return path.join(process.cwd(), 'data');
}

const DATA_DIR = resolveDataDir();

function ensureDataDir(): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    return true;
  } catch (err) {
    console.warn('[DB] Unable to create data directory:', err);
    return false;
  }
}

function readJSON<T>(filename: string, fallback: T): T {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    if (ensureDataDir()) {
      try {
        fs.writeFileSync(filepath, JSON.stringify(fallback, null, 2));
      } catch {
        /* read-only FS — return fallback without persisting */
      }
    }
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(filename: string, data: T): void {
  if (!ensureDataDir()) return;
  try {
    const filepath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.warn(`[DB] Unable to write ${filename}:`, err);
  }
}

export function getCampaigns(): CampaignState[] {
  return readJSON<CampaignState[]>('campaigns.json', []);
}

export function getCampaign(id: string): CampaignState | undefined {
  return getCampaigns().find((c) => c.id === id);
}

export function saveCampaign(campaign: CampaignState): void {
  const campaigns = getCampaigns();
  const idx = campaigns.findIndex((c) => c.id === campaign.id);
  if (idx >= 0) campaigns[idx] = campaign;
  else campaigns.push(campaign);
  writeJSON('campaigns.json', campaigns);

  void syncCampaignToSupabase(campaign).catch((err) => {
    console.warn('[DB] Supabase sync failed:', err);
  });
}

export function getAgentLog(): AgentMessage[] {
  return readJSON<AgentMessage[]>('agent_log.json', []);
}

export function appendAgentLog(message: AgentMessage): void {
  const log = getAgentLog();
  log.push(message);
  writeJSON('agent_log.json', log);
}

export function getAgentState(): Record<string, AgentMemory> {
  return readJSON<Record<string, AgentMemory>>('agent_state.json', {});
}

export function updateAgentMemory(agent: string, memory: Partial<AgentMemory>): void {
  const state = getAgentState();
  state[agent] = {
    agent: agent as AgentMemory['agent'],
    lastRun: new Date().toISOString(),
    confidence: memory.confidence ?? state[agent]?.confidence ?? 0.8,
    retries: memory.retries ?? state[agent]?.retries ?? 0,
    notes: [...(state[agent]?.notes ?? []), ...(memory.notes ?? [])].slice(-20),
  };
  writeJSON('agent_state.json', state);
}

export async function initSupabase() {
  const { getSupabaseServer } = await import('@/lib/supabase/client');
  const client = getSupabaseServer();
  if (!client) return null;

  try {
    const { error } = await client.from('campaigns').select('id').limit(1);
    if (error && error.code !== 'PGRST116' && !error.message.includes('does not exist')) {
      throw error;
    }
    return client;
  } catch {
    if (process.env.USE_SQLITE_FALLBACK === 'true') {
      console.log('[DB] Supabase unavailable, using in-memory/file fallback');
    }
    return null;
  }
}

async function syncCampaignToSupabase(campaign: CampaignState): Promise<void> {
  const client = await initSupabase();
  if (!client) return;

  const { error } = await client.from('campaigns').upsert({
    id: campaign.id,
    data: campaign,
    status: campaign.status,
    updated_at: campaign.updatedAt,
  });

  if (error) {
    throw new Error(error.message);
  }
}
