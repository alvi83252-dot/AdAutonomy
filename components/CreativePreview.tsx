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
          className="group relative rounded-xl overflow-hidden border border-border bg-card p-6"
        >
          <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-all duration-500" />
          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded mb-3">
            Variant {creative.variant}
          </span>
          <h3 className="text-lg font-bold mb-2 relative">{creative.headline}</h3>
          <p className="text-sm text-muted-foreground mb-4 relative">{creative.body}</p>
          <span className="relative inline-block px-4 py-2 text-sm font-medium bg-primary rounded-lg text-primary-foreground">
            {creative.cta}
          </span>
          <p className="text-xs text-muted-foreground/60 mt-3 italic">{creative.imagePrompt}</p>
        </motion.div>
      ))}
    </div>
  );
}
