'use client';

import { AnimatedCard } from '@/components/AnimatedCard';
import { AgentLoader } from '@/components/AgentLoader';
import { LoadingShimmer } from '@/components/LoadingShimmer';
import { PageWrapper } from '@/components/PageWrapper';
import type { CampaignState } from '@/lib/types';

interface CampaignPageLoaderProps {
  loading: boolean;
  campaign: CampaignState | null;
  title: string;
  emptyMessage?: string;
  children: (campaign: CampaignState) => React.ReactNode;
}

export function CampaignPageLoader({
  loading,
  campaign,
  title,
  emptyMessage = 'Launch a campaign from the home page to see results.',
  children,
}: CampaignPageLoaderProps) {
  if (loading) {
    return (
      <PageWrapper title={title}>
        <AnimatedCard className="flex flex-col items-center py-16 gap-6">
          <AgentLoader size="lg" label="Loading campaign data..." />
          <LoadingShimmer lines={4} className="w-full max-w-md" />
        </AnimatedCard>
      </PageWrapper>
    );
  }

  if (!campaign) {
    return (
      <PageWrapper title={title}>
        <AnimatedCard className="flex flex-col items-center py-16 gap-4 text-center">
          <AgentLoader size="md" />
          <p className="text-muted-foreground text-sm max-w-sm">{emptyMessage}</p>
        </AnimatedCard>
      </PageWrapper>
    );
  }

  return <PageWrapper title={title}>{children(campaign)}</PageWrapper>;
}
