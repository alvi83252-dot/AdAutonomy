'use client';

import { AnimatedCard } from '@/components/AnimatedCard';
import { CampaignPageLoader } from '@/components/CampaignPageLoader';
import { useCampaign } from '@/hooks/useCampaign';

export default function AudiencePage() {
  const { campaign, loading } = useCampaign();

  return (
    <CampaignPageLoader
      loading={loading}
      campaign={campaign}
      title="Audience & Channels"
      emptyMessage="Launch a campaign from the home page to see channel selections."
    >
      {(c) => (
        <>
          <p className="text-muted-foreground -mt-4 mb-4">Selected by AudienceAgent — Marketing Team</p>
          <div className="grid gap-4 md:grid-cols-2">
            {c.audiences.map((channel, i) => (
              <AnimatedCard key={channel.name} delay={i * 0.1}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg">{channel.name}</h3>
                  <span className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded">{channel.platform}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-2xl font-bold text-indigo-400">{channel.reach.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Est. Reach</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-400">${channel.costPerClick}</p>
                    <p className="text-xs text-muted-foreground">CPC</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{channel.rationale}</p>
              </AnimatedCard>
            ))}
          </div>
        </>
      )}
    </CampaignPageLoader>
  );
}
