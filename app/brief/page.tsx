'use client';

import { AnimatedCard } from '@/components/AnimatedCard';
import { CampaignPageLoader } from '@/components/CampaignPageLoader';
import { useCampaign } from '@/hooks/useCampaign';

export default function BriefPage() {
  const { campaign, loading } = useCampaign();

  return (
    <CampaignPageLoader loading={loading} campaign={campaign} title="Campaign Brief">
      {(c) => {
        const brief = c.extractedBrief || {};
        return (
          <AnimatedCard>
            <h2 className="text-lg font-semibold text-indigo-400 mb-4">BriefingAgent Output</h2>
            <div className="space-y-3">
              <p><strong>Product:</strong> {c.brief.productName}</p>
              <p><strong>Market:</strong> {c.brief.targetMarket}</p>
              <p><strong>Goal:</strong> {c.brief.campaignGoal}</p>
              {brief.summary != null && <p><strong>Summary:</strong> {String(brief.summary)}</p>}
              {Array.isArray(brief.objectives) && (
                <div>
                  <strong>Objectives:</strong>
                  <ul className="list-disc list-inside mt-1 text-muted-foreground">
                    {(brief.objectives as string[]).map((o, i) => <li key={i}>{o}</li>)}
                  </ul>
                </div>
              )}
              {brief.tone != null && <p><strong>Tone:</strong> {String(brief.tone)}</p>}
              {brief.budget != null && <p><strong>Budget:</strong> ${String(brief.budget)}</p>}
              {brief.timeline != null && <p><strong>Timeline:</strong> {String(brief.timeline)}</p>}
            </div>
          </AnimatedCard>
        );
      }}
    </CampaignPageLoader>
  );
}
