'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/brief', label: 'Brief' },
  { href: '/creative', label: 'Creative' },
  { href: '/videos', label: 'Videos' },
  { href: '/simulation', label: 'Simulation' },
  { href: '/deploy', label: 'Deploy' },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl transition-colors duration-500"
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl group">
          <motion.div whileHover={{ rotate: 15, scale: 1.1 }} transition={{ type: 'spring', stiffness: 400 }}>
            <Zap className="w-6 h-6 text-indigo-400" />
          </motion.div>
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            AdAutonomy
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className="relative px-3 py-1.5 text-sm rounded-md">
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 bg-indigo-500/20 rounded-md border border-indigo-500/30"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span
                  className={cn(
                    'relative z-10 transition-colors duration-200',
                    isActive ? 'text-indigo-300 font-medium' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            className="md:hidden p-2 rounded-md hover:bg-muted/50"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-border/50 overflow-hidden"
          >
            <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'px-3 py-2 text-sm rounded-md transition-colors',
                    pathname === item.href
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
