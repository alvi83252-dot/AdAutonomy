'use client';

import { motion } from 'framer-motion';
import { AnimatedCard } from '@/components/AnimatedCard';
import { CampaignPageLoader } from '@/components/CampaignPageLoader';
import { useCampaign } from '@/hooks/useCampaign';

export default function SimulationPage() {
  const { campaign, loading } = useCampaign();

  return (
    <CampaignPageLoader
      loading={loading}
      campaign={campaign?.simulation ? campaign : null}
      title="Performance Simulation"
      emptyMessage="Launch a campaign from the home page to see performance forecasts."
    >
      {(c) => {
        const sim = c.simulation!;
        const metrics = [
          { label: 'Impressions', value: sim.impressions.toLocaleString(), color: 'text-foreground' },
          { label: 'Clicks', value: sim.clicks.toLocaleString(), color: 'text-foreground' },
          { label: 'Conversions', value: sim.conversions.toLocaleString(), color: 'text-foreground' },
          { label: 'CTR', value: `${sim.ctr}%`, color: 'text-foreground' },
          { label: 'CPC', value: `$${sim.cpc}`, color: 'text-foreground' },
          { label: 'ROAS', value: `${sim.roas}x`, color: 'text-primary' },
          { label: 'Revenue', value: `$${sim.projectedRevenue.toLocaleString()}`, color: 'text-primary' },
        ];
        return (
          <>
            <div className="flex flex-wrap items-center gap-2 -mt-4 mb-4 text-sm text-muted-foreground">
              <span>Forecasted by SimulationAgent — Data Analyst</span>
              {sim.compute && (
                <span className="rounded-full border border-border/70 bg-card/60 px-2.5 py-1">
                  {sim.compute.provider === 'modal' ? 'Modal serverless' : 'Local fallback'}
                  {' · '}
                  {sim.compute.runs.toLocaleString()} runs
                  {sim.compute.provider === 'modal' ? ` · ${sim.compute.latencyMs}ms` : ''}
                </span>
              )}
            </div>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {metrics.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <AnimatedCard className="text-center" hover={false}>
                    <p className={`text-3xl font-bold tabular-nums ${m.color}`}>{m.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{m.label}</p>
                  </AnimatedCard>
                </motion.div>
              ))}
            </div>
          </>
        );
      }}
    </CampaignPageLoader>
  );
}
