'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles } from 'lucide-react';

const AGENT_NAMES = [
  'BriefingAgent',
  'CreativeAgent',
  'AudienceAgent',
  'SimulationAgent',
  'SafetyAgent',
  'FeedbackAgent',
  'PaymentAgent',
  'InvestorAgent',
  'DeploymentAgent',
  'VideoAgent',
];

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

function AgentCycle() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % AGENT_NAMES.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={AGENT_NAMES[index]}
        className="text-sm text-muted-foreground font-mono"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        Running {AGENT_NAMES[index]}...
      </motion.p>
    </AnimatePresence>
  );
}

export function LoadingOverlay({ visible, message = 'Agents orchestrating your campaign...' }: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-background/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="flex flex-col items-center gap-8 p-10 rounded-2xl border border-white/10 bg-card/50 backdrop-blur-xl shadow-2xl max-w-md mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <div className="relative">
              <motion.div
                className="w-20 h-20 rounded-full border-2 border-indigo-500/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border-2 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent"
                animate={{ rotate: -360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Bot className="w-8 h-8 text-indigo-400" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-lg font-semibold flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                {message}
              </p>
              <AgentCycle />
            </div>

            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 8, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
