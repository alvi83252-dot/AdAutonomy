'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}

export function AnimatedCard({ children, className, delay = 0, hover = true }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={hover ? { scale: 1.02, y: -4 } : undefined}
      className={cn(
        'rounded-xl border border-border/50 bg-card p-6 shadow-xl',
        'transition-shadow duration-300 hover:shadow-primary/10 hover:border-primary/20',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
