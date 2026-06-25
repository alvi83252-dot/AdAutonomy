import { NextRequest, NextResponse } from 'next/server';
import { getAgentLog, getAgentState } from '@/lib/storage/db';

export async function GET(req: NextRequest) {
  const agent = req.nextUrl.searchParams.get('agent');
  const log = getAgentLog();
  const state = getAgentState();

  if (agent) {
    return NextResponse.json({
      messages: log.filter((m) => m.from === agent || m.to === agent),
      memory: state[agent] || null,
    });
  }

  return NextResponse.json({ log, state });
}
