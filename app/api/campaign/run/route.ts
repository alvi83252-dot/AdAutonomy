import { NextRequest, NextResponse } from 'next/server';
import { createCampaign, runPipeline } from '@/lib/orchestrator';
import { getAgentLog } from '@/lib/storage/db';
import type { CampaignBrief } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const brief: CampaignBrief = {
      productName: body.productName,
      targetMarket: body.targetMarket,
      campaignGoal: body.campaignGoal,
      budget: body.budget,
      timeline: body.timeline,
    };

    if (!brief.productName || !brief.targetMarket || !brief.campaignGoal) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const campaign = createCampaign(brief);
    const result = await runPipeline(campaign);
    const messages = getAgentLog().filter((m) => m.timestamp >= campaign.createdAt);

    return NextResponse.json({ campaign: result, messages });
  } catch (err) {
    console.error('[API] Campaign run failed:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET() {
  const { getCampaigns } = await import('@/lib/storage/db');
  return NextResponse.json({ campaigns: getCampaigns() });
}
