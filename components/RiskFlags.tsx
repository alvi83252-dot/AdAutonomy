'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Shield, Info, XCircle } from 'lucide-react';
import type { SafetyFlag } from '@/lib/types';
import { cn } from '@/lib/utils';

interface RiskFlagsProps {
  flags: SafetyFlag[];
}

const severityConfig = {
  low: { icon: Info, color: 'text-green-400 border-green-500/30 bg-green-500/10' },
  medium: { icon: AlertTriangle, color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
  high: { icon: AlertTriangle, color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
  critical: { icon: XCircle, color: 'text-red-400 border-red-500/30 bg-red-500/10' },
};

export function RiskFlags({ flags }: RiskFlagsProps) {
  if (flags.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-green-400 p-4 rounded-lg border border-green-500/30 bg-green-500/10"
      >
        <Shield className="w-5 h-5" />
        <span>All safety checks passed</span>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      {flags.map((flag, i) => {
        const config = severityConfig[flag.severity];
        const Icon = config.icon;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.01 }}
            className={cn('flex items-start gap-3 p-3 rounded-lg border', config.color)}
          >
            <Icon className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase">{flag.severity}</span>
                <span className="text-xs text-muted-foreground">{flag.category}</span>
              </div>
              <p className="text-sm mt-1">{flag.message}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
