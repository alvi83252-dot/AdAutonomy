import { NextRequest, NextResponse } from 'next/server';
import { getCampaign } from '@/lib/storage/db';
import { generateCampaignPack } from '@/lib/pdf/exportPack';

export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get('campaignId');

  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
  }

  const campaign = getCampaign(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const html = generateCampaignPack(campaign);

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
