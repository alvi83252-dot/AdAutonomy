'use client';

import { motion } from 'framer-motion';
import { Bot, CheckCircle2, ExternalLink, Route, ShieldCheck, Workflow } from 'lucide-react';
import { AnimatedCard } from '@/components/AnimatedCard';
import { CampaignPageLoader } from '@/components/CampaignPageLoader';
import { useCampaign } from '@/hooks/useCampaign';

const priorityClass = {
  high: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
  medium: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
  low: 'border-border/70 bg-muted/40 text-muted-foreground',
};

export default function OrchestrationPage() {
  const { campaign, loading } = useCampaign();

  return (
    <CampaignPageLoader
      loading={loading}
      campaign={campaign?.orchestration ? campaign : null}
      title="Agent Orchestration"
      emptyMessage="Launch a campaign to generate its Manus supervisory plan."
    >
      {(c) => {
        const orchestration = c.orchestration!;
        return (
          <>
            <div className="flex flex-wrap items-center gap-2 -mt-4 mb-5 text-sm text-muted-foreground">
              <span>CEO planning layer</span>
              <span
                className={`rounded-full border px-2.5 py-1 ${
                  orchestration.provider === 'manus'
                    ? 'border-green-500/40 bg-green-500/10 text-green-300'
                    : 'border-border/70 bg-card/60'
                }`}
              >
                {orchestration.provider === 'manus'
                  ? `Manus API · ${orchestration.latencyMs}ms`
                  : 'Local supervisor fallback'}
              </span>
              {orchestration.taskUrl && (
                <a
                  href={orchestration.taskUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                >
                  Open Manus task <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <AnimatedCard className="lg:col-span-2">
                <h2 className="flex items-center gap-2 font-semibold mb-3">
                  <Workflow className="h-5 w-5 text-indigo-400" />
                  Execution strategy
                </h2>
                <p className="text-sm">{orchestration.summary}</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {orchestration.executionStrategy}
                </p>
              </AnimatedCard>

              <AnimatedCard>
                <h2 className="flex items-center gap-2 font-semibold mb-3">
                  <ShieldCheck className="h-5 w-5 text-purple-400" />
                  Risk checkpoints
                </h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {orchestration.riskCheckpoints.map((checkpoint) => (
                    <li key={checkpoint} className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400 mt-0.5" />
                      <span>{checkpoint}</span>
                    </li>
                  ))}
                </ul>
              </AnimatedCard>
            </div>

            <AnimatedCard>
              <h2 className="flex items-center gap-2 font-semibold mb-5">
                <Route className="h-5 w-5 text-cyan-400" />
                Delegation plan
              </h2>
              <div className="space-y-3">
                {orchestration.steps.map((step, index) => (
                  <motion.div
                    key={step.stepId}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="grid gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 md:grid-cols-[36px_180px_1fr]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-bold text-indigo-300">
                      {index + 1}
                    </div>
                    <div>
                      <p className="flex items-center gap-2 font-medium">
                        <Bot className="h-4 w-4 text-purple-400" />
                        {step.agent}
                      </p>
                      <span
                        className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[11px] uppercase ${priorityClass[step.priority]}`}
                      >
                        {step.priority} priority
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p>{step.objective}</p>
                      <p className="text-xs text-muted-foreground">
                        Validation: {step.validation}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatedCard>

            {orchestration.fallbackReason && (
              <p className="text-xs text-muted-foreground">
                Fallback reason: {orchestration.fallbackReason}
              </p>
            )}
          </>
        );
      }}
    </CampaignPageLoader>
  );
}
