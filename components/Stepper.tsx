'use client';

import { motion } from 'framer-motion';
import { Check, Circle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PipelineStep } from '@/lib/types';

interface StepperProps {
  steps: PipelineStep[];
  currentStep: number;
}

const statusIcons = {
  pending: Circle,
  active: Loader2,
  complete: Check,
  error: AlertCircle,
  skipped: Circle,
};

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
        <motion.div
          className="absolute top-5 left-0 h-0.5 bg-primary"
          initial={{ width: '0%' }}
          animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />

        {steps.map((step, i) => {
          const Icon = statusIcons[step.status];
          const isActive = i === currentStep;
          const isComplete = step.status === 'complete';

          return (
            <motion.div
              key={step.id}
              className="flex flex-col items-center relative z-10"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                  isComplete && 'bg-primary border-primary text-primary-foreground',
                  isActive && 'border-primary bg-primary/20 text-primary',
                  step.status === 'error' && 'border-red-500 bg-red-500/20 text-red-400',
                  step.status === 'pending' && 'border-border bg-background text-muted-foreground'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive && step.status === 'active' && 'animate-spin')} />
              </div>
              <span
                className={cn(
                  'mt-2 text-xs text-center max-w-[80px]',
                  isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
