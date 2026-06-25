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
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadVideo } from '@/lib/video/composeVideo';
import { uploadVideoFromBrowser } from '@/lib/supabase/videoStorage';
import { PLATFORM_CONFIG, type SocialPlatform } from '@/lib/social/platforms';
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

async function uploadVideoForSharing(blob: Blob, filename: string): Promise<string> {
  try {
    const result = await uploadVideoFromBrowser(blob, filename);
    return result.url;
  } catch (browserErr) {
    const form = new FormData();
    form.append('video', blob, filename);
    const res = await fetch('/api/video/upload', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        data.error || (browserErr as Error).message || 'Video upload failed'
      );
    }
    return data.url as string;
  }
}

export function SocialSharePanel({ videoBlob, productName, tagline, className }: SocialSharePanelProps) {
  const [selected, setSelected] = useState<SocialPlatform[]>(['instagram', 'tiktok', 'twitter']);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const filename = `${productName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-ad.webm`;

  function togglePlatform(p: SocialPlatform) {
    setSelected((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function buildCaption(extraUrl?: string) {
    const url = extraUrl || videoUrl;
    const base = `${tagline}\n\n#${productName.replace(/\s+/g, '')} #AdAutonomy`;
    return url ? `${base}\n\nWatch: ${url}` : base;
  }

  async function copyCaption(text?: string) {
    const caption = text || buildCaption();
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy caption — select and copy manually.');
    }
  }

  async function handleDownload() {
    if (!videoBlob) return;
    downloadVideo(videoBlob, filename);
  }

  async function handleNativeShare() {
    if (!videoBlob) return;

    setUploading(true);
    setError('');
    try {
      let url = videoUrl;
      if (!url) {
        url = await uploadVideoForSharing(videoBlob, filename);
        setVideoUrl(url);
      }

      const file = new File([videoBlob], filename, { type: videoBlob.type || 'video/webm' });
      const shareWithFile = { title: `${productName} Ad`, text: buildCaption(url), files: [file] };
      const shareWithUrl = { title: `${productName} Ad`, text: buildCaption(url), url };

      if (navigator.canShare?.(shareWithFile)) {
        await navigator.share(shareWithFile);
        return;
      }
      if (navigator.canShare?.(shareWithUrl)) {
        await navigator.share(shareWithUrl);
        return;
      }

      await copyCaption(buildCaption(url));
      handleDownload();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handlePublish() {
    if (!videoBlob || selected.length === 0) {
      setError('Select at least one platform');
      return;
    }

    setPublishing(true);
    setUploading(true);
    setError('');
    setSuccessMessage('');
    setPosts([]);

    try {
      let url = videoUrl;
      if (!url) {
        url = await uploadVideoForSharing(videoBlob, filename);
        setVideoUrl(url);
      }
      setUploading(false);

      const res = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms: selected,
          productName,
          tagline,
          videoFilename: filename,
          videoUrl: url,
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          autoPublish: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publishing failed');

      const publishedPosts = data.posts as SocialPost[];
      setPosts(publishedPosts);
      setSuccessMessage(
        'Video uploaded! Caption copied — open each platform and paste the link or upload the file.'
      );

      await copyCaption(buildCaption(url));
      handleDownload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPublishing(false);
      setUploading(false);
    }
  }

  if (!videoBlob) return null;

  return (
    <div className={cn('space-y-4', className)}>
      {videoUrl && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs flex items-start gap-2">
          <Link2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-medium text-primary mb-1">Video hosted for sharing</p>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground break-all hover:text-primary underline"
            >
              {videoUrl}
            </a>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="glow" onClick={handleDownload} className="flex-1 min-w-[140px]">
          <Download className="w-4 h-4 mr-2" />
          Download Video
        </Button>
        <Button
          variant="outline"
          onClick={handleNativeShare}
          disabled={uploading}
          className="flex-1 min-w-[140px]"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Share2 className="w-4 h-4 mr-2" />
          )}
          Share Device
        </Button>
        <Button variant="outline" onClick={() => copyCaption()}>
          <Copy className="w-4 h-4 mr-2" />
          {copied ? 'Copied!' : 'Copy Caption'}
        </Button>
      </div>

      <div className="rounded-xl border border-border/50 p-4 space-y-4 bg-muted/20">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Share2 className="w-4 h-4 text-primary" />
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
                type="button"
                onClick={() => togglePlatform(platform)}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isSelected
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border/50 hover:border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center',
                    config.color
                  )}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="truncate w-full text-center">{config.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {error && <p className="text-destructive text-xs">{error}</p>}

        <Button
          variant="glow"
          className="w-full"
          onClick={handlePublish}
          disabled={publishing || uploading || selected.length === 0}
        >
          {publishing || uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {uploading ? 'Uploading video...' : 'Publishing...'}
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 mr-2" /> Share Video to {selected.length} Platform
              {selected.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          Uploads your video to cloud storage, copies caption + link, downloads the file, then opens
          each platform so you can post. Instagram/TikTok need the downloaded file; X/LinkedIn/WhatsApp
          can use the link.
        </p>

        <AnimatePresence>
          {posts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2 pt-2 border-t border-border/50"
            >
              {successMessage && (
                <p className="text-xs text-green-400 mb-2">{successMessage}</p>
              )}
              {posts.map((post) => {
                const shareUrl = post.shareUrl || PLATFORM_CONFIG[post.platform].uploadUrl;
                return (
                  <div
                    key={post.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-success/10 text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium capitalize">{post.platform}</span>
                      <span className="text-muted-foreground ml-2 text-xs capitalize">
                        {post.status}
                      </span>
                    </div>
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-xs font-medium px-2 py-1 rounded-md border border-primary/30"
                    >
                      Open
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
