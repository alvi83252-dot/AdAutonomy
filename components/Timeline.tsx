'use client';

import { motion } from 'framer-motion';
import type { AgentMessage } from '@/lib/types';

// Semantic message types: a leading status dot carries the color cue, with a
// full hairline border + faint tint on the row (no side-stripe).
const typeStyles: Record<string, { surface: string; dot: string }> = {
  request: { surface: 'border-blue-500/30 bg-blue-500/5', dot: 'bg-blue-500' },
  response: { surface: 'border-green-500/30 bg-green-500/5', dot: 'bg-green-500' },
  approval: { surface: 'border-emerald-500/30 bg-emerald-500/5', dot: 'bg-emerald-500' },
  veto: { surface: 'border-red-500/30 bg-red-500/5', dot: 'bg-red-500' },
  escalation: { surface: 'border-orange-500/30 bg-orange-500/5', dot: 'bg-orange-500' },
  info: { surface: 'border-border bg-muted/30', dot: 'bg-muted-foreground' },
};

interface TimelineProps {
  messages: AgentMessage[];
}

export function Timeline({ messages }: TimelineProps) {
  if (messages.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        Agent activity will appear here as the pipeline runs...
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
      {messages
        .slice()
        .reverse()
        .map((msg, i) => {
          const style = typeStyles[msg.type] || typeStyles.info;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-lg border px-3 py-2 ${style.surface}`}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                <span className="font-medium text-foreground">{msg.from}</span>
                <span aria-hidden>→</span>
                <span>{msg.to}</span>
                <span className="ml-auto tabular-nums">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm mt-1 capitalize">{msg.type}</p>
            </motion.div>
          );
        })}
    </div>
  );
}
