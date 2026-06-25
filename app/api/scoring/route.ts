import { NextRequest, NextResponse } from 'next/server';
import { getCampaign, getCampaigns } from '@/lib/storage/db';
import { calculateDragonflyScore } from '@/lib/sponsors/dragonflyScoring';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');

    if (campaignId) {
      const campaign = getCampaign(campaignId);
      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }
      const score = campaign.autonomyScore || calculateDragonflyScore(campaign);
      return NextResponse.json({ campaignId, score });
    }

    const campaigns = getCampaigns();
    const scores = campaigns.map((c) => ({
      campaignId: c.id,
      productName: c.brief.productName,
      score: c.autonomyScore || calculateDragonflyScore(c),
    }));
    scores.sort((a, b) => b.score.overall - a.score.overall);

    return NextResponse.json({ scores, total: scores.length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { campaignId } = await req.json();
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
    }

    const campaign = getCampaign(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const score = calculateDragonflyScore(campaign);
    return NextResponse.json({ campaignId, score });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
