import { sendMessage } from '@/lib/agents/messaging';
import {
  readStorageJSON,
  syncSocialPostToSupabase,
  updateAgentMemory,
  writeStorageJSON,
} from '@/lib/storage/db';
import {
  buildShareCaption,
  getPlatformShareUrl,
  type SocialPlatform,
  type SocialPost,
} from '@/lib/social/platforms';
import { generateId } from '@/lib/utils';

const SOCIAL_POSTS_FILE = 'social_posts.json';

export function getSocialPosts(): SocialPost[] {
  return readStorageJSON<SocialPost[]>(SOCIAL_POSTS_FILE, []);
}

function saveSocialPosts(posts: SocialPost[]) {
  writeStorageJSON(SOCIAL_POSTS_FILE, posts);
}

export type PublishInput = {
  platforms: SocialPlatform[];
  productName: string;
  tagline: string;
  videoFilename?: string;
  autoPublish?: boolean;
  pageUrl?: string;
};

export async function publishToSocial(input: PublishInput): Promise<SocialPost[]> {
  const results: SocialPost[] = [];
  const now = new Date().toISOString();
  const pageUrl = input.pageUrl || process.env.NEXT_PUBLIC_APP_URL || '';

  for (const platform of input.platforms) {
    const { caption, hashtags } = buildShareCaption(input.productName, input.tagline, platform);

    const hasRealCredentials = checkPlatformCredentials(platform);
    const status = input.autoPublish
      ? hasRealCredentials
        ? 'published'
        : 'scheduled'
      : 'draft';

    const post: SocialPost = {
      id: generateId(),
      platform,
      caption,
      hashtags,
      videoFilename: input.videoFilename,
      status,
      shareUrl: getPlatformShareUrl(platform, caption, pageUrl),
      postUrl: hasRealCredentials ? `https://${platform}.com/post/mock-${Date.now()}` : undefined,
      scheduledAt: status === 'scheduled' ? now : undefined,
      publishedAt: status === 'published' ? now : undefined,
      createdAt: now,
    };

    results.push(post);

    void syncSocialPostToSupabase({
      id: post.id,
      platform: post.platform,
      status: post.status,
      data: post as unknown as Record<string, unknown>,
    }).catch((err) => {
      console.warn('[Social] Supabase sync failed:', err);
    });

    await sendMessage('DeploymentAgent', 'Orchestrator', 'info', {
      action: 'social_publish',
      platform,
      status,
      mock: !hasRealCredentials,
    });
  }

  const existing = getSocialPosts();
  saveSocialPosts([...existing, ...results]);

  updateAgentMemory('DeploymentAgent', {
    confidence: 0.9,
    notes: [`Published to ${results.length} platform(s)`],
  });

  return results;
}

function checkPlatformCredentials(platform: SocialPlatform): boolean {
  const credMap: Record<SocialPlatform, string | undefined> = {
    instagram: process.env.META_ACCESS_TOKEN,
    facebook: process.env.META_ACCESS_TOKEN,
    tiktok: process.env.TIKTOK_ACCESS_TOKEN,
    linkedin: process.env.LINKEDIN_ACCESS_TOKEN,
    twitter: process.env.TWITTER_BEARER_TOKEN,
    youtube: process.env.YOUTUBE_API_KEY,
  };
  return !!credMap[platform];
}
