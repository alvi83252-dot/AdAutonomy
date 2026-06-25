import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Navbar } from '@/components/Navbar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppShell } from '@/components/AppShell';
import { PersonalAssistant } from '@/components/PersonalAssistant';

export const metadata: Metadata = {
  title: 'AdAutonomy — Autonomous Advertising Platform',
  description: 'Self-running advertising company powered by AI agents',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans min-h-screen parallax-bg transition-colors duration-500">
        <ThemeProvider>
          <ErrorBoundary>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <AppShell>{children}</AppShell>
            </main>
            <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground transition-colors duration-500">
              <p>AdAutonomy — Cursor Hands Off London Hackathon</p>
              <p className="mt-1">
                Powered by Cursor · OpenAI · Supabase · PayPal · Vercel Eve · Halkin Offices
              </p>
            </footer>
            <PersonalAssistant />
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
