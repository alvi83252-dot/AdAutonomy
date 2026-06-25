'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LoadingShimmerProps {
  className?: string;
  lines?: number;
}

export function LoadingShimmer({ className, lines = 3 }: LoadingShimmerProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="h-4 rounded-md bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-shimmer"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}
