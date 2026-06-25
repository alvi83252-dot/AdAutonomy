import { NextRequest, NextResponse } from 'next/server';
import { getCampaign } from '@/lib/storage/db';
import { generateICS } from '@/lib/calendar/icsGenerator';

export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get('campaignId');

  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
  }

  const campaign = getCampaign(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const ics = generateICS(campaign);

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${campaign.brief.productName}-timeline.ics"`,
    },
  });
}
