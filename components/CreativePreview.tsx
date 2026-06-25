'use client';

import { motion } from 'framer-motion';
import type { CreativeAsset } from '@/lib/types';

interface CreativePreviewProps {
  creatives: CreativeAsset[];
}

export function CreativePreview({ creatives }: CreativePreviewProps) {
  if (creatives.length === 0) {
    return <p className="text-muted-foreground text-sm">No creatives generated yet.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {creatives.map((creative, i) => (
        <motion.div
          key={creative.variant}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15 }}
          whileHover={{ y: -8, rotateY: 2 }}
          className="group relative rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-indigo-950/50 to-purple-950/50 p-6 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/10 group-hover:to-purple-500/10 transition-all duration-500" />
          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-indigo-500/30 text-indigo-300 rounded mb-3">
            Variant {creative.variant}
          </span>
          <h3 className="text-lg font-bold mb-2 relative">{creative.headline}</h3>
          <p className="text-sm text-muted-foreground mb-4 relative">{creative.body}</p>
          <button className="relative px-4 py-2 text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg text-white">
            {creative.cta}
          </button>
          <p className="text-xs text-muted-foreground/60 mt-3 italic">{creative.imagePrompt}</p>
        </motion.div>
      ))}
    </div>
  );
}
