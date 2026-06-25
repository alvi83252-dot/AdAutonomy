'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const child = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export function PageWrapper({ children, title, subtitle, className }: PageWrapperProps) {
  return (
    <motion.div
      className={cn('space-y-6', className)}
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {(title || subtitle) && (
        <motion.div variants={child}>
          {title && <h1 className="text-3xl font-bold">{title}</h1>}
          {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
        </motion.div>
      )}
      <motion.div variants={child}>{children}</motion.div>
    </motion.div>
  );
}
