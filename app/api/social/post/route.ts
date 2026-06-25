import { NextRequest, NextResponse } from 'next/server';
import { publishToSocial } from '@/lib/agents/socialMediaAgent';
import type { SocialPlatform } from '@/lib/social/platforms';

const VALID_PLATFORMS: SocialPlatform[] = ['instagram', 'tiktok', 'linkedin', 'twitter', 'youtube', 'facebook'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const platforms = (body.platforms || []).filter((p: string) => VALID_PLATFORMS.includes(p as SocialPlatform));

    if (platforms.length === 0) {
      return NextResponse.json({ error: 'Select at least one platform' }, { status: 400 });
    }

    if (!body.productName?.trim()) {
      return NextResponse.json({ error: 'Product name required' }, { status: 400 });
    }

    const posts = await publishToSocial({
      platforms,
      productName: body.productName.trim(),
      tagline: body.tagline || `Check out ${body.productName}!`,
      videoFilename: body.videoFilename,
      autoPublish: body.autoPublish !== false,
    });

    const hasCredentials = posts.some((p) => p.status === 'published');
    const mockMode = !hasCredentials;

    return NextResponse.json({
      posts,
      mockMode,
      message: mockMode
        ? 'Posts scheduled (simulated). Add social API keys in .env for live publishing.'
        : 'Posts published successfully',
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET() {
  const { getSocialPosts } = await import('@/lib/agents/socialMediaAgent');
  return NextResponse.json({ posts: getSocialPosts() });
}
