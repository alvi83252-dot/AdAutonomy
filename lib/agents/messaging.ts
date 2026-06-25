import { appendAgentLog, updateAgentMemory } from '@/lib/storage/db';
import type { AgentMessage, AgentName } from '@/lib/types';
import { generateId } from '@/lib/utils';

export async function sendMessage(
  from: AgentName,
  to: AgentName | 'broadcast',
  type: AgentMessage['type'],
  payload: Record<string, unknown>,
  confidence?: number
): Promise<AgentMessage> {
  const message: AgentMessage = {
    id: generateId(),
    from,
    to,
    type,
    payload,
    timestamp: new Date().toISOString(),
    confidence,
  };

  appendAgentLog(message);
  updateAgentMemory(from, {
    notes: [`Sent ${type} to ${to}`],
    confidence: confidence ?? 0.8,
  });

  return message;
}

export async function receiveMessages(
  agent: AgentName,
  since?: string
): Promise<AgentMessage[]> {
  const { getAgentLog } = await import('@/lib/storage/db');
  const log = getAgentLog();
  return log.filter(
    (m) =>
      (m.to === agent || m.to === 'broadcast') &&
      m.from !== agent &&
      (!since || m.timestamp > since)
  );
}

export async function requestApproval(
  from: AgentName,
  to: AgentName,
  payload: Record<string, unknown>
): Promise<AgentMessage> {
  return sendMessage(from, to, 'request', payload);
}

export async function sendApproval(
  from: AgentName,
  to: AgentName,
  approved: boolean,
  reason?: string
): Promise<AgentMessage> {
  return sendMessage(from, to, approved ? 'approval' : 'veto', { approved, reason });
}

export async function escalate(
  from: AgentName,
  to: AgentName,
  reason: string,
  payload: Record<string, unknown> = {}
): Promise<AgentMessage> {
  return sendMessage(from, to, 'escalation', { reason, ...payload });
}
