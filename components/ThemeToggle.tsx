'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const themes = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
] as const;

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-[108px] h-9 rounded-full bg-muted/50 animate-pulse" />;
  }

  const current = theme || 'dark';

  function handleThemeChange(value: string) {
    document.documentElement.classList.add('theme-transition');
    setTheme(value);
    setTimeout(() => document.documentElement.classList.remove('theme-transition'), 500);
  }

  return (
    <div className="relative flex items-center gap-0.5 p-1 rounded-full bg-muted/50 border border-border/50 backdrop-blur-sm">
      {themes.map(({ value, icon: Icon, label }) => {
        const isActive = current === value;
        return (
          <button
            key={value}
            onClick={() => handleThemeChange(value)}
            className={cn(
              'relative z-10 p-2 rounded-full transition-colors duration-200',
              isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
            title={label}
            aria-label={`Switch to ${label} mode`}
          >
            {isActive && (
              <motion.div
                layoutId="theme-pill"
                className="absolute inset-0 rounded-full bg-background shadow-sm border border-border/50"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <Icon className="w-4 h-4 relative z-10" />
          </button>
        );
      })}
      <span className="sr-only">Current theme: {resolvedTheme}</span>
    </div>
  );
}
