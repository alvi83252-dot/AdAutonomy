'use client';

import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizes = {
  sm: { outer: 'w-8 h-8', icon: 'w-3 h-3', text: 'text-xs' },
  md: { outer: 'w-12 h-12', icon: 'w-5 h-5', text: 'text-sm' },
  lg: { outer: 'w-16 h-16', icon: 'w-7 h-7', text: 'text-base' },
};

export function AgentLoader({ size = 'md', label, className }: AgentLoaderProps) {
  const s = sizes[size];

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="relative">
        <motion.div
          className={cn(s.outer, 'rounded-full border-2 border-indigo-500/20')}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className={cn('absolute inset-1 rounded-full border-2 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent')}
          animate={{ rotate: -360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Bot className={cn(s.icon, 'text-indigo-400')} />
        </div>
      </div>
      {label && (
        <motion.p
          className={cn(s.text, 'text-muted-foreground')}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {label}
        </motion.p>
      )}
    </div>
  );
}
