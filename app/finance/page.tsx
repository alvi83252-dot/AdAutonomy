'use client';

import { motion } from 'framer-motion';
import {
  BadgeDollarSign,
  BookOpenCheck,
  CircleGauge,
  Landmark,
  ReceiptText,
  WalletCards,
} from 'lucide-react';
import { AnimatedCard } from '@/components/AnimatedCard';
import { CampaignPageLoader } from '@/components/CampaignPageLoader';
import { useCampaign } from '@/hooks/useCampaign';

export default function FinancePage() {
  const { campaign, loading } = useCampaign();

  return (
    <CampaignPageLoader
      loading={loading}
      campaign={campaign?.finance ? campaign : null}
      title="Financial Control"
      emptyMessage="Launch a campaign to generate its Seapoint cash-flow and bookkeeping controls."
    >
      {(c) => {
        const finance = c.finance!;
        const metrics = [
          {
            label: 'Consolidated cash',
            value: money(finance.currentCash, finance.currency),
            icon: Landmark,
            color: 'text-indigo-400',
          },
          {
            label: 'Campaign spend',
            value: money(finance.campaignSpend, finance.currency),
            icon: WalletCards,
            color: 'text-purple-400',
          },
          {
            label: 'Monthly burn',
            value: money(finance.monthlyBurn, finance.currency),
            icon: BadgeDollarSign,
            color: 'text-orange-400',
          },
          {
            label: 'Cash runway',
            value: `${finance.runwayMonths} mo`,
            icon: CircleGauge,
            color: finance.runwayMonths >= 12 ? 'text-green-400' : 'text-yellow-400',
          },
        ];

        return (
          <>
            <div className="flex flex-wrap items-center gap-2 -mt-4 mb-5 text-sm text-muted-foreground">
              <span>Finance operations by PaymentAgent + Seapoint controls</span>
              <span
                className={`rounded-full border px-2.5 py-1 ${
                  finance.sync.status === 'synced'
                    ? 'border-green-500/40 bg-green-500/10 text-green-300'
                    : finance.sync.status === 'failed'
                      ? 'border-orange-500/40 bg-orange-500/10 text-orange-300'
                      : 'border-border/70 bg-card/60'
                }`}
              >
                {finance.sync.status === 'synced'
                  ? 'Seapoint bridge synced'
                  : finance.sync.status === 'failed'
                    ? 'Bridge unavailable · local controls active'
                    : 'Local Seapoint mode'}
              </span>
            </div>

            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {metrics.map((metric, index) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <AnimatedCard hover={false}>
                    <metric.icon className={`h-5 w-5 ${metric.color} mb-4`} />
                    <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{metric.label}</p>
                  </AnimatedCard>
                </motion.div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <AnimatedCard>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <ReceiptText className="h-5 w-5 text-indigo-400" />
                    Invoice approvals
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    Threshold {money(finance.approvalThreshold, finance.currency)}
                  </span>
                </div>
                <div className="space-y-3">
                  {finance.invoices.map((invoice) => (
                    <div key={invoice.id} className="rounded-lg bg-muted/50 p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">{invoice.supplier}</p>
                          <p className="text-xs text-muted-foreground">{invoice.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {money(invoice.amount, invoice.currency)}
                          </p>
                          <p
                            className={`text-xs ${
                              invoice.status === 'needs_approval'
                                ? 'text-yellow-400'
                                : 'text-green-400'
                            }`}
                          >
                            {invoice.status === 'needs_approval'
                              ? 'Needs approval'
                              : 'Auto-approved'}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {invoice.approvalReason}
                      </p>
                    </div>
                  ))}
                </div>
              </AnimatedCard>

              <AnimatedCard>
                <h2 className="flex items-center gap-2 font-semibold mb-4">
                  <BookOpenCheck className="h-5 w-5 text-purple-400" />
                  AI bookkeeping
                </h2>
                <div className="space-y-3">
                  {finance.bookkeeping.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 p-3"
                    >
                      <div>
                        <p className="font-medium">{entry.category}</p>
                        <p className="text-xs text-muted-foreground">
                          {(entry.confidence * 100).toFixed(0)}% categorisation confidence
                        </p>
                      </div>
                      <p
                        className={`font-semibold ${
                          entry.direction === 'inflow' ? 'text-green-400' : ''
                        }`}
                      >
                        {entry.direction === 'inflow' ? '+' : '-'}
                        {money(entry.amount, entry.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </AnimatedCard>
            </div>

            <AnimatedCard>
              <h2 className="font-semibold mb-4">Projected cash flow</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <CashFlowMetric
                  label="Opening cash"
                  value={money(finance.openingCash, finance.currency)}
                />
                <CashFlowMetric
                  label="Projected campaign revenue"
                  value={money(finance.projectedRevenue, finance.currency)}
                  positive
                />
                <CashFlowMetric
                  label="Net campaign cash flow"
                  value={`${finance.netCashFlow >= 0 ? '+' : ''}${money(
                    finance.netCashFlow,
                    finance.currency
                  )}`}
                  positive={finance.netCashFlow >= 0}
                />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">{finance.sync.message}</p>
            </AnimatedCard>
          </>
        );
      }}
    </CampaignPageLoader>
  );
}

function CashFlowMetric({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-4">
      <p className={`text-xl font-bold ${positive ? 'text-green-400' : ''}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
