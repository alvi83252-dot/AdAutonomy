'use client';

import { Download, Calendar, FileText } from 'lucide-react';
import { AnimatedCard } from '@/components/AnimatedCard';
import { Button } from '@/components/ui/button';
import { CampaignPageLoader } from '@/components/CampaignPageLoader';
import { useCampaign } from '@/hooks/useCampaign';

export default function DeployPage() {
  const { campaign, loading } = useCampaign();

  return (
    <CampaignPageLoader
      loading={loading}
      campaign={campaign}
      title="Deploy & Export"
      emptyMessage="Launch a campaign from the home page to export deliverables."
    >
      {(c) => (
        <>
          <p className="text-muted-foreground -mt-4 mb-4">
            DeploymentAgent — IO ops simulation + Dragonfly autonomy scoring
          </p>

          <AnimatedCard className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/15 text-success mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {c.status === 'deployed' ? 'Campaign Deployed' : `Status: ${c.status}`}
            </h2>
            <p className="text-muted-foreground mb-6">
              {c.brief.productName} — autonomous pipeline complete
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="glow" onClick={() => downloadICS(c.id, c.brief.productName)}>
                <Calendar className="w-4 h-4 mr-2" />
                Download Timeline (.ics)
              </Button>
              <Button variant="outline" onClick={() => downloadPack(c.id)}>
                <Download className="w-4 h-4 mr-2" />
                View Campaign Pack
              </Button>
            </div>
          </AnimatedCard>

          <AnimatedCard>
            <h3 className="font-semibold mb-3">Deployment Summary</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">Creatives</p>
                <p className="text-xl font-bold">{c.creatives.length}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">Channels</p>
                <p className="text-xl font-bold">{c.audiences.length}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">Payments</p>
                <p className="text-xl font-bold">{c.payments.length}</p>
              </div>
            </div>
          </AnimatedCard>
        </>
      )}
    </CampaignPageLoader>
  );
}

function downloadICS(campaignId: string, productName: string) {
  fetch(`/api/export/ics?campaignId=${campaignId}`)
    .then((res) => res.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${productName}-timeline.ics`;
      a.click();
      URL.revokeObjectURL(url);
    });
}

function downloadPack(campaignId: string) {
  window.open(`/api/export/pack?campaignId=${campaignId}`, '_blank');
}
