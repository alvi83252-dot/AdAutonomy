'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Bot, Shield, TrendingUp, Video } from 'lucide-react';
import { AnimatedCard } from '@/components/AnimatedCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stepper } from '@/components/Stepper';
import { Timeline } from '@/components/Timeline';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { PIPELINE_STEPS } from '@/lib/pipeline';
import type { CampaignState, AgentMessage, PipelineStep } from '@/lib/types';
import Link from 'next/link';

export default function HomePage() {
  const [productName, setProductName] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<CampaignState | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [error, setError] = useState('');

  async function handleLaunch() {
    if (!productName || !targetMarket || !campaignGoal) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/campaign/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, targetMarket, campaignGoal }),
      });

      if (!res.ok) throw new Error('Pipeline failed');
      const data = await res.json();
      setCampaign(data.campaign);
      setMessages(data.messages || []);

      localStorage.setItem('currentCampaign', JSON.stringify(data.campaign));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function loadDemo() {
    setProductName('EcoBottle Pro');
    setTargetMarket('Environmentally conscious millennials in urban areas');
    setCampaignGoal('Drive 10,000 pre-orders in 30 days');
  }

  const steps = campaign
    ? PIPELINE_STEPS.map((s, i) => ({
        ...s,
        status: (i < campaign.currentStep
          ? 'complete'
          : i === campaign.currentStep
            ? campaign.status === 'failed'
              ? 'error'
              : 'complete'
            : 'pending') as PipelineStep['status'],
      }))
    : PIPELINE_STEPS;

  return (
    <div className="space-y-12">
      <LoadingOverlay visible={loading} />
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center space-y-6 py-12"
      >
        <h1 className="text-5xl md:text-8xl font-black tracking-tight text-balance">
          <span className="text-primary">
            AdAutonomy
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto text-pretty">
          A self-running advertising company powered entirely by AI agents.
          Hands off. Fully autonomous.
        </p>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="grid grid-cols-1 md:grid-cols-5 gap-px overflow-hidden rounded-xl border border-border/50 bg-border/60 shadow-xl"
      >
        {[
          { icon: Bot, title: '10 AI Agents', desc: 'Autonomous team' },
          { icon: Video, title: 'Ad Videos', desc: 'AI-generated commercials' },
          { icon: Shield, title: 'Safety First', desc: 'Compliance built-in' },
          { icon: TrendingUp, title: 'Live Simulation', desc: 'Performance forecasting' },
          { icon: Rocket, title: 'One Click', desc: 'Full campaign deploy' },
        ].map((item) => (
          <div key={item.title} className="flex flex-col items-center gap-2 p-5 text-center bg-card">
            <item.icon className="w-7 h-7 text-primary" />
            <h3 className="font-semibold text-sm">{item.title}</h3>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </motion.div>

      <AnimatedCard delay={0.3}>
        <h2 className="text-3xl font-bold mb-6">Launch Autonomous Campaign</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="product">Product Name</Label>
            <Input
              id="product"
              placeholder="EcoBottle Pro"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="market">Target Market</Label>
            <Input
              id="market"
              placeholder="Urban millennials"
              value={targetMarket}
              onChange={(e) => setTargetMarket(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal">Campaign Goal</Label>
            <Input
              id="goal"
              placeholder="10,000 pre-orders in 30 days"
              value={campaignGoal}
              onChange={(e) => setCampaignGoal(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="flex gap-3">
          <Button variant="glow" size="lg" onClick={handleLaunch} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <motion.span
                  className="inline-block w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
                Agents Working...
              </span>
            ) : (
              'Launch Autonomous Campaign'
            )}
          </Button>
          <Button variant="outline" size="lg" onClick={loadDemo}>
            Load Demo
          </Button>
        </div>
      </AnimatedCard>

      {(loading || campaign) && (
        <AnimatedCard delay={0.1}>
          <h3 className="text-lg font-semibold mb-6">Agent Pipeline</h3>
          <Stepper steps={steps} currentStep={campaign?.currentStep ?? 0} />
        </AnimatedCard>
      )}

      {messages.length > 0 && (
        <AnimatedCard delay={0.2}>
          <h3 className="text-lg font-semibold mb-4">Agent Activity Log</h3>
          <Timeline messages={messages} />
        </AnimatedCard>
      )}

      {campaign?.status === 'deployed' && (
        <AnimatedCard delay={0.3} className="text-center">
          <h3 className="text-2xl font-bold text-green-400 mb-4">Campaign Deployed Successfully</h3>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/videos"><Button variant="glow">Create Ad Video</Button></Link>
            <Link href="/creative"><Button variant="outline">View Creatives</Button></Link>
            <Link href="/simulation"><Button variant="outline">View Simulation</Button></Link>
            <Link href="/deploy"><Button variant="outline">Export Pack</Button></Link>
          </div>
        </AnimatedCard>
      )}
    </div>
  );
}