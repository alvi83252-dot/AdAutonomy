'use client';

import { SplashScreen } from '@/components/SplashScreen';
import { NavigationProgress } from '@/components/NavigationProgress';
import { PageTransition } from '@/components/PageTransition';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SplashScreen />
      <NavigationProgress />
      <PageTransition>{children}</PageTransition>
    </>
  );
}
