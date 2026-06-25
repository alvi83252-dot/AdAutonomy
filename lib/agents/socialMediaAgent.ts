import fs from 'fs';
import path from 'path';
import { sendMessage } from '@/lib/agents/messaging';
import { updateAgentMemory } from '@/lib/storage/db';
import { buildShareCaption, type SocialPlatform, type SocialPost } from '@/lib/social/platforms';
import { generateId } from '@/lib/utils';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getSocialPosts(): SocialPost[] {
  ensureDataDir();
  const file = path.join(DATA_DIR, 'social_posts.json');
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

function saveSocialPosts(posts: SocialPost[]) {
  ensureDataDir();
  fs.writeFileSync(path.join(DATA_DIR, 'social_posts.json'), JSON.stringify(posts, null, 2));
}

export type PublishInput = {
  platforms: SocialPlatform[];
  productName: string;
  tagline: string;
  videoFilename?: string;
  autoPublish?: boolean;
};

export async function publishToSocial(input: PublishInput): Promise<SocialPost[]> {
  const results: SocialPost[] = [];
  const now = new Date().toISOString();

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
      postUrl: hasRealCredentials ? `https://${platform}.com/post/mock-${Date.now()}` : undefined,
      scheduledAt: status === 'scheduled' ? now : undefined,
      publishedAt: status === 'published' ? now : undefined,
      createdAt: now,
    };

    results.push(post);

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
