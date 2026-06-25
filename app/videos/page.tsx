'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Upload,
  Sparkles,
  Play,
  Image as ImageIcon,
  Type,
  Clapperboard,
  CheckCircle2,
  Users,
  Mic,
} from 'lucide-react';
import { AnimatedCard } from '@/components/AnimatedCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AgentLoader } from '@/components/AgentLoader';
import { PageWrapper } from '@/components/PageWrapper';
import { VideoPlayer } from '@/components/VideoPlayer';
import { SocialSharePanel } from '@/components/SocialSharePanel';
import { composeAdVideo } from '@/lib/video/composeVideo';
import { optimizeImageForVideo } from '@/lib/video/imageUtils';
import type { VideoAdScript } from '@/lib/types';
import { cn } from '@/lib/utils';

type Step = 'idle' | 'scripting' | 'voiceover' | 'rendering' | 'ready';

const STEPS = [
  { key: 'scripting', label: 'VideoAgent writing script & narration' },
  { key: 'voiceover', label: 'Generating voiceover & music' },
  { key: 'rendering', label: 'Rendering HD video frames' },
  { key: 'ready', label: 'Video ready to watch' },
];

export default function VideosPage() {
  const [productName, setProductName] = useState('');
  const [productText, setProductText] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageOptimizing, setImageOptimizing] = useState(false);
  const [script, setScript] = useState<VideoAdScript | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [progress, setProgress] = useState(0);
  const [currentScene, setCurrentScene] = useState('');
  const [error, setError] = useState('');
  const [hasAiVoice, setHasAiVoice] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, WebP)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB');
      return;
    }

    setImageOptimizing(true);
    setError('');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const optimized = await optimizeImageForVideo(reader.result as string);
        setImagePreview(optimized);
      } catch {
        setError('Failed to process image');
      } finally {
        setImageOptimizing(false);
      }
    };
    reader.readAsDataURL(file);
  }

  function loadFromCampaign() {
    const stored = localStorage.getItem('currentCampaign');
    if (!stored) {
      setError('No campaign found — launch one from Home first');
      return;
    }
    try {
      const campaign = JSON.parse(stored);
      setProductName(campaign.brief?.productName || '');
      setProductText(
        [campaign.brief?.campaignGoal, campaign.brief?.targetMarket]
          .filter(Boolean)
          .join('. ') || ''
      );
      setTargetMarket(campaign.brief?.targetMarket || '');
      setError('');
    } catch {
      setError('Could not load campaign data');
    }
  }

  async function handleGenerate() {
    if (!productName.trim()) {
      setError('Enter a product name');
      return;
    }
    if (!productText.trim() && !imagePreview) {
      setError('Add product description text or upload an image');
      return;
    }

    setError('');
    setStep('scripting');
    setScript(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setVideoBlob(null);

    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          productText,
          targetMarket,
          hasImage: !!imagePreview,
        }),
      });

      if (!res.ok) throw new Error('Script generation failed');
      const { script: generatedScript } = await res.json();
      setScript(generatedScript);

      setStep('voiceover');
      setProgress(0);

      setStep('rendering');

      const { blob, hasAiVoice: aiVoice } = await composeAdVideo(
        generatedScript,
        imagePreview || undefined,
        (p, scene) => {
          setProgress(p);
          setCurrentScene(scene);
        }
      );

      setHasAiVoice(aiVoice);

      const url = URL.createObjectURL(blob);
      setVideoBlob(blob);
      setVideoUrl(url);
      setStep('ready');

      localStorage.setItem(
        'lastVideoAd',
        JSON.stringify({ productName, targetMarket, script: generatedScript, createdAt: new Date().toISOString() })
      );
    } catch (err) {
      setError((err as Error).message);
      setStep('idle');
    }
  }

  const isGenerating = step === 'scripting' || step === 'voiceover' || step === 'rendering';

  return (
    <PageWrapper
      title="Ad Video Studio"
      subtitle="Upload a product image and describe your product — VideoAgent creates a voiced HD advertisement"
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <AnimatedCard className="space-y-5">
          <div className="flex items-center gap-2 text-indigo-400">
            <Clapperboard className="w-5 h-5" />
            <h2 className="font-semibold text-lg">Create Advertisement</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="v-product">Product Name</Label>
            <Input
              id="v-product"
              placeholder="EcoBottle Pro"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="v-market" className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Target Audience
            </Label>
            <Input
              id="v-market"
              placeholder="Eco-conscious millennials in urban areas"
              value={targetMarket}
              onChange={(e) => setTargetMarket(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="v-text" className="flex items-center gap-2">
              <Type className="w-4 h-4" /> Product Description
            </Label>
            <textarea
              id="v-text"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Key features, benefits, pricing, what makes it unique, call to action..."
              value={productText}
              onChange={(e) => setProductText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              More detail = richer narration and more scenes in your ad
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Product Image
            </Label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <div
              onClick={() => !imageOptimizing && fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
                'hover:border-indigo-500/50 hover:bg-indigo-500/5',
                imagePreview ? 'border-indigo-500/30' : 'border-border'
              )}
            >
              {imageOptimizing ? (
                <AgentLoader size="sm" label="Optimizing image for HD video..." />
              ) : imagePreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Product"
                    className="max-h-48 mx-auto rounded-lg object-contain bg-black/20 p-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Image auto-fitted · click to change
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="w-8 h-8" />
                  <p className="text-sm">Upload product photo (PNG, JPG — max 10MB)</p>
                  <p className="text-xs">Displayed with proper fit — no stretching or blur</p>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button variant="glow" onClick={handleGenerate} disabled={isGenerating || imageOptimizing} className="flex-1">
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Ad Video'}
            </Button>
            <Button variant="outline" onClick={loadFromCampaign}>
              Load from Campaign
            </Button>
          </div>
        </AnimatedCard>

        <div className="space-y-4">
          <AnimatePresence>
            {isGenerating || step === 'ready' ? (
              <AnimatedCard>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Video className="w-4 h-4 text-purple-400" />
                  VideoAgent Pipeline
                </h3>
                <div className="space-y-3">
                  {STEPS.map((s, i) => {
                    const order = ['scripting', 'voiceover', 'rendering', 'ready'];
                    const stepIdx = order.indexOf(step);
                    const thisIdx = order.indexOf(s.key);
                    const isActive = step === s.key;
                    const isDone = stepIdx > thisIdx;

                    return (
                      <motion.div
                        key={s.key}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg text-sm',
                          isActive && 'bg-indigo-500/10 border border-indigo-500/20',
                          isDone && 'opacity-60'
                        )}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                        ) : isActive ? (
                          <AgentLoader size="sm" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-muted-foreground/30 shrink-0" />
                        )}
                        <span>{s.label}</span>
                        {isActive && step === 'rendering' && (
                          <span className="ml-auto text-xs text-muted-foreground">{Math.round(progress * 100)}%</span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
                {step === 'rendering' && currentScene && (
                  <p className="text-xs text-muted-foreground mt-3 font-mono">Rendering: {currentScene}</p>
                )}
              </AnimatedCard>
            ) : null}
          </AnimatePresence>

          {script && (
            <AnimatedCard delay={0.1}>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Mic className="w-4 h-4 text-indigo-400" />
                Storyboard — {script.tagline}
              </h3>
              {script.targetMarket && (
                <p className="text-xs text-muted-foreground mb-3">Audience: {script.targetMarket}</p>
              )}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {script.scenes.map((scene, i) => (
                  <div key={scene.id} className="flex gap-3 p-2 rounded-lg bg-muted/30 text-sm">
                    <span className="text-indigo-400 font-mono text-xs shrink-0 pt-0.5">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="font-medium">{scene.headline}</p>
                      <p className="text-muted-foreground text-xs">{scene.subtext}</p>
                      <p className="text-xs text-purple-300/80 mt-1 italic">&ldquo;{scene.narration}&rdquo;</p>
                      <p className="text-xs text-purple-400 mt-0.5">
                        {scene.duration}s · {scene.animation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {script.totalDuration}s total · {script.musicStyle} · HD 1920×1080
              </p>
            </AnimatedCard>
          )}

          <AnimatedCard delay={0.2} className="overflow-hidden">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Play className="w-4 h-4 text-green-400" />
              Advertisement Preview
            </h3>

            {videoUrl && script ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <VideoPlayer src={videoUrl} script={script} hasAiVoice={hasAiVoice} />
                <SocialSharePanel
                  videoBlob={videoBlob}
                  productName={productName}
                  tagline={script.tagline}
                />
              </motion.div>
            ) : isGenerating ? (
              <div className="flex flex-col items-center py-16 gap-4">
                <AgentLoader
                  size="lg"
                  label={
                    step === 'scripting'
                      ? 'Writing script & narration...'
                      : step === 'voiceover'
                        ? 'Preparing voiceover & music...'
                        : 'Rendering HD video...'
                  }
                />
                {step === 'rendering' && (
                  <div className="w-full max-w-xs h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center py-16 text-muted-foreground gap-3">
                <Video className="w-12 h-12 opacity-30" />
                <p className="text-sm text-center max-w-xs">
                  Your voiced HD advertisement will appear here with subtitles and background music.
                </p>
              </div>
            )}
          </AnimatedCard>
        </div>
      </div>
    </PageWrapper>
  );
}
