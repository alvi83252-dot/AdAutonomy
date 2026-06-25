export type SocialPlatform = 'instagram' | 'tiktok' | 'linkedin' | 'twitter' | 'youtube' | 'facebook';

export type SocialPost = {
  id: string;
  platform: SocialPlatform;
  caption: string;
  hashtags: string[];
  videoFilename?: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  postUrl?: string;
  shareUrl?: string;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
};

export const PLATFORM_CONFIG: Record<
  SocialPlatform,
  { name: string; icon: string; color: string; maxCaption: number; uploadUrl: string }
> = {
  instagram: {
    name: 'Instagram',
    icon: 'Instagram',
    color: 'from-pink-500 to-purple-600',
    maxCaption: 2200,
    uploadUrl: 'https://www.instagram.com/',
  },
  tiktok: {
    name: 'TikTok',
    icon: 'Music2',
    color: 'from-gray-900 to-gray-700',
    maxCaption: 2200,
    uploadUrl: 'https://www.tiktok.com/upload',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: 'Linkedin',
    color: 'from-blue-600 to-blue-800',
    maxCaption: 3000,
    uploadUrl: 'https://www.linkedin.com/feed/',
  },
  twitter: {
    name: 'X (Twitter)',
    icon: 'Twitter',
    color: 'from-gray-800 to-black',
    maxCaption: 280,
    uploadUrl: 'https://twitter.com/compose/tweet',
  },
  youtube: {
    name: 'YouTube',
    icon: 'Youtube',
    color: 'from-red-600 to-red-800',
    maxCaption: 5000,
    uploadUrl: 'https://www.youtube.com/upload',
  },
  facebook: {
    name: 'Facebook',
    icon: 'Facebook',
    color: 'from-blue-500 to-blue-700',
    maxCaption: 63206,
    uploadUrl: 'https://www.facebook.com/',
  },
};

export function buildShareCaption(
  productName: string,
  tagline: string,
  platform: SocialPlatform
): { caption: string; hashtags: string[] } {
  const hashtags = [
    productName.replace(/\s+/g, ''),
    'AdAutonomy',
    'NewProduct',
    platform === 'linkedin' ? 'Marketing' : 'Ad',
  ].slice(0, platform === 'twitter' ? 3 : 5);

  const tagStr = hashtags.map((h) => `#${h}`).join(' ');
  let caption = `${tagline}\n\nDiscover ${productName} — your next favorite find.\n\n${tagStr}`;

  const max = PLATFORM_CONFIG[platform].maxCaption;
  if (caption.length > max) {
    caption = caption.slice(0, max - 3) + '...';
  }

  return { caption, hashtags };
}

export function getPlatformShareUrl(
  platform: SocialPlatform,
  caption: string,
  pageUrl?: string
): string {
  const encoded = encodeURIComponent(caption.slice(0, 200));
  const page =
    pageUrl ||
    (typeof window !== 'undefined' ? window.location.href : '') ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://adautonomy.vercel.app';
  switch (platform) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encoded}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(page)}&summary=${encoded}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?quote=${encoded}`;
    default:
      return PLATFORM_CONFIG[platform].uploadUrl;
  }
}
