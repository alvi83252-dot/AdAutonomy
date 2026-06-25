'use client';

import { motion } from 'framer-motion';
import type { AgentMessage } from '@/lib/types';

interface TimelineProps {
  messages: AgentMessage[];
}

const typeColors: Record<string, string> = {
  request: 'border-blue-500/50 bg-blue-500/10',
  response: 'border-green-500/50 bg-green-500/10',
  approval: 'border-emerald-500/50 bg-emerald-500/10',
  veto: 'border-red-500/50 bg-red-500/10',
  escalation: 'border-orange-500/50 bg-orange-500/10',
  info: 'border-gray-500/50 bg-gray-500/10',
};

export function Timeline({ messages }: TimelineProps) {
  if (messages.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        Agent activity will appear here as the pipeline runs...
      </p>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
      {messages
        .slice()
        .reverse()
        .map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`border-l-2 pl-4 py-2 rounded-r-lg ${typeColors[msg.type] || typeColors.info}`}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{msg.from}</span>
              <span>→</span>
              <span>{msg.to}</span>
              <span className="ml-auto">{new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="text-sm mt-1 capitalize">{msg.type}</p>
          </motion.div>
        ))}
    </div>
  );
}
