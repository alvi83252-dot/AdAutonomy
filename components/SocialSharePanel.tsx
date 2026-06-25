'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Share2,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Facebook,
  Music2,
  CheckCircle2,
  ExternalLink,
  Copy,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadVideo } from '@/lib/video/composeVideo';
import {
  PLATFORM_CONFIG,
  getPlatformShareUrl,
  type SocialPlatform,
} from '@/lib/social/platforms';
import type { SocialPost } from '@/lib/social/platforms';
import { cn } from '@/lib/utils';

const PLATFORM_ICONS: Record<SocialPlatform, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  tiktok: Music2,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
  facebook: Facebook,
};

interface SocialSharePanelProps {
  videoBlob: Blob | null;
  productName: string;
  tagline: string;
  className?: string;
}

export function SocialSharePanel({ videoBlob, productName, tagline, className }: SocialSharePanelProps) {
  const [selected, setSelected] = useState<SocialPlatform[]>(['instagram', 'tiktok']);
  const [publishing, setPublishing] = useState(false);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const filename = `${productName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-ad.webm`;

  function togglePlatform(p: SocialPlatform) {
    setSelected((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function handleDownload() {
    if (!videoBlob) return;
    downloadVideo(videoBlob, filename);
  }

  async function handleNativeShare() {
    if (!videoBlob) return;
    const file = new File([videoBlob], filename, { type: videoBlob.type });
    const shareData = { title: `${productName} Ad`, text: tagline, files: [file] };

    if (navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {
        /* user cancelled */
      }
    } else {
      handleDownload();
    }
  }

  async function handlePublish() {
    if (selected.length === 0) {
      setError('Select at least one platform');
      return;
    }

    setPublishing(true);
    setError('');
    setPosts([]);

    try {
      const res = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms: selected,
          productName,
          tagline,
          videoFilename: filename,
          autoPublish: true,
        }),
      });

      if (!res.ok) throw new Error('Publishing failed');
      const data = await res.json();
      setPosts(data.posts);

      for (const post of data.posts as SocialPost[]) {
        const url = getPlatformShareUrl(post.platform, post.caption);
        if (data.mockMode) {
          window.open(PLATFORM_CONFIG[post.platform].uploadUrl, '_blank', 'noopener');
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPublishing(false);
    }
  }

  function copyCaption() {
    const caption = `${tagline}\n\n#${productName.replace(/\s+/g, '')} #AdAutonomy`;
    navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!videoBlob) return null;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap gap-2">
        <Button variant="glow" onClick={handleDownload} className="flex-1 min-w-[140px]">
          <Download className="w-4 h-4 mr-2" />
          Download Video
        </Button>
        <Button variant="outline" onClick={handleNativeShare} className="flex-1 min-w-[140px]">
          <Share2 className="w-4 h-4 mr-2" />
          Share Device
        </Button>
        <Button variant="outline" onClick={copyCaption}>
          <Copy className="w-4 h-4 mr-2" />
          {copied ? 'Copied!' : 'Copy Caption'}
        </Button>
      </div>

      <div className="rounded-xl border border-border/50 p-4 space-y-4 bg-muted/20">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Share2 className="w-4 h-4 text-indigo-400" />
          Publish to Social Media
        </h4>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {(Object.keys(PLATFORM_CONFIG) as SocialPlatform[]).map((platform) => {
            const Icon = PLATFORM_ICONS[platform];
            const isSelected = selected.includes(platform);
            const config = PLATFORM_CONFIG[platform];

            return (
              <button
                key={platform}
                onClick={() => togglePlatform(platform)}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-all',
                  isSelected
                    ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                    : 'border-border/50 hover:border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <div className={cn('w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center', config.color)}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="truncate w-full text-center">{config.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <Button
          variant="glow"
          className="w-full"
          onClick={handlePublish}
          disabled={publishing || selected.length === 0}
        >
          {publishing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...</>
          ) : (
            <><Share2 className="w-4 h-4 mr-2" /> Auto-Publish to {selected.length} Platform{selected.length !== 1 ? 's' : ''}</>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          Simulated publish opens upload pages. Add social API keys in <code className="text-indigo-400">.env.local</code> for live auto-posting.
        </p>

        <AnimatePresence>
          {posts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2 pt-2 border-t border-border/50"
            >
              {posts.map((post) => (
                <div key={post.id} className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium capitalize">{post.platform}</span>
                    <span className="text-muted-foreground ml-2 text-xs capitalize">{post.status}</span>
                  </div>
                  <a
                    href={PLATFORM_CONFIG[post.platform].uploadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
