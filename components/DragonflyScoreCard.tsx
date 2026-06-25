'use client';

import { motion } from 'framer-motion';
import { Shield, Zap, TrendingUp, CheckCircle, AlertTriangle, BarChart3 } from 'lucide-react';
import type { DragonflyScore } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DragonflyScoreCardProps {
  score: DragonflyScore;
}

function ScoreGauge({ value, label, icon: Icon, color }: {
  value: number;
  label: string;
  icon: React.ElementType;
  color: string;
}) {
  const pct = Math.round(value * 100);
  const strokeDasharray = 2 * Math.PI * 40;
  const strokeDashoffset = strokeDasharray * (1 - value);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center"
    >
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6"
            className="text-white/10" />
          <motion.circle
            cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            initial={{ strokeDashoffset: strokeDasharray }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className={cn('w-6 h-6', color.replace('stroke-', 'text-'))} />
        </div>
      </div>
      <span className="text-2xl font-bold mt-1">{pct}%</span>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </motion.div>
  );
}

const breakdownLabels: Record<string, string> = {
  creativeQuality: 'Creative',
  audienceDiversity: 'Audience',
  simulationConsistency: 'Simulation',
  safetyCompliance: 'Safety',
  pipelineEfficiency: 'Pipeline',
  agentConfidence: 'Confidence',
  paymentIntegrity: 'Payments',
};

export function DragonflyScoreCard({ score }: DragonflyScoreCardProps) {
  const color = score.overall >= 0.7 ? 'stroke-green-400' : score.overall >= 0.4 ? 'stroke-yellow-400' : 'stroke-red-400';
  const textColor = score.overall >= 0.7 ? 'text-green-400' : score.overall >= 0.4 ? 'text-yellow-400' : 'text-red-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-xl p-6 shadow-xl"
    >
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-5 h-5 text-indigo-400" />
        <h3 className="font-semibold">Dragonfly Technical Excellence Score</h3>
        <span className="text-xs text-muted-foreground ml-auto">dragonfly.xyz</span>
      </div>

      <div className="flex justify-around items-start mb-8">
        <ScoreGauge value={score.overall} label="Overall" icon={Zap} color={color} />
        <ScoreGauge value={score.technicalExcellence} label="Technical" icon={BarChart3} color="stroke-indigo-400" />
        <ScoreGauge value={score.autonomy} label="Autonomy" icon={TrendingUp} color="stroke-purple-400" />
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {Object.entries(score.breakdown).map(([key, val]) => {
          const pct = Math.round(val * 100);
          const barColor = val >= 0.7 ? 'bg-green-500' : val >= 0.4 ? 'bg-yellow-500' : 'bg-red-500';
          return (
            <div key={key} className="text-center">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className={cn('h-full rounded-full', barColor)}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{breakdownLabels[key] || key}</span>
            </div>
          );
        })}
      </div>

      <div className={cn('flex items-center gap-2 text-sm mb-3', textColor)}>
        {score.overall >= 0.7 ? (
          <><CheckCircle className="w-4 h-4" /> <span>Excellent — campaign demonstrates strong autonomy and technical quality</span></>
        ) : score.overall >= 0.4 ? (
          <><AlertTriangle className="w-4 h-4" /> <span>Moderate — room for improvement in several dimensions</span></>
        ) : (
          <><AlertTriangle className="w-4 h-4" /> <span>Needs work — review individual scores for specific areas</span></>
        )}
      </div>

      {score.detail && (
        <p className="text-xs text-muted-foreground leading-relaxed">{score.detail}</p>
      )}
    </motion.div>
  );
}
