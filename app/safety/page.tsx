'use client';

import { AnimatedCard } from '@/components/AnimatedCard';
import { RiskFlags } from '@/components/RiskFlags';
import { CampaignPageLoader } from '@/components/CampaignPageLoader';
import { useCampaign } from '@/hooks/useCampaign';

export default function SafetyPage() {
  const { campaign, loading } = useCampaign();

  return (
    <CampaignPageLoader
      loading={loading}
      campaign={campaign}
      title="Safety & Compliance"
      emptyMessage="Launch a campaign from the home page to see safety review results."
    >
      {(c) => (
        <>
          <p className="text-muted-foreground -mt-4 mb-4">
            Reviewed by SafetyAgent — Elyos AI + 10 Downing Street ethical guidelines
          </p>
          <AnimatedCard>
            <RiskFlags flags={c.safetyFlags} />
          </AnimatedCard>
          {c.approvals.filter((a) => a.agent === 'SafetyAgent').map((a) => (
            <AnimatedCard key={a.timestamp}>
              <p className="text-sm">
                <strong>SafetyAgent verdict:</strong>{' '}
                {a.approved ? '✅ Approved' : '❌ Rejected'} — {a.reason}
              </p>
            </AnimatedCard>
          ))}
        </>
      )}
    </CampaignPageLoader>
  );
}
