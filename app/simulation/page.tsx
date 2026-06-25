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
          { label: 'Impressions', value: sim.impressions.toLocaleString(), color: 'text-indigo-400' },
          { label: 'Clicks', value: sim.clicks.toLocaleString(), color: 'text-blue-400' },
          { label: 'Conversions', value: sim.conversions.toLocaleString(), color: 'text-purple-400' },
          { label: 'CTR', value: `${sim.ctr}%`, color: 'text-pink-400' },
          { label: 'CPC', value: `$${sim.cpc}`, color: 'text-cyan-400' },
          { label: 'ROAS', value: `${sim.roas}x`, color: 'text-green-400' },
          { label: 'Revenue', value: `$${sim.projectedRevenue.toLocaleString()}`, color: 'text-emerald-400' },
        ];
        return (
          <>
            <p className="text-muted-foreground -mt-4 mb-4">Forecasted by SimulationAgent — Data Analyst</p>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {metrics.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <AnimatedCard className="text-center" hover={false}>
                    <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
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
