import { complete, parseJSON } from '@/lib/llm/provider';
import { sendMessage } from '@/lib/agents/messaging';
import { withRetry } from '@/lib/agents/consensus';
import { updateAgentMemory } from '@/lib/storage/db';
import { extractFeatureBullets } from '@/lib/video/narration';
import type { VideoAdScript, VideoScene } from '@/lib/types';
import { generateId } from '@/lib/utils';

export type VideoAgentInput = {
  productName: string;
  productText: string;
  targetMarket?: string;
  hasImage: boolean;
};

function buildNarration(headline: string, subtext: string, productName: string): string {
  return `${headline}. ${subtext}. Discover ${productName} today.`;
}

function fallbackScript(input: VideoAgentInput): VideoAdScript {
  const features = extractFeatureBullets(input.productText, 3);
  const market = input.targetMarket || 'customers everywhere';

  const scenes: VideoScene[] = [
    {
      id: '1',
      type: 'intro',
      headline: input.productName,
      subtext: `Crafted for ${market}`,
      narration: buildNarration(input.productName, `The perfect choice for ${market}`, input.productName),
      duration: 4,
      animation: 'fade',
    },
    {
      id: '2',
      type: 'product',
      headline: 'Introducing',
      subtext: input.productText.slice(0, 140) || 'Innovation that changes everything',
      narration: buildNarration(
        `Introducing ${input.productName}`,
        input.productText.slice(0, 180) || 'A breakthrough product designed with you in mind',
        input.productName
      ),
      duration: 5,
      animation: input.hasImage ? 'kenburns' : 'zoom',
    },
  ];

  features.forEach((feat, i) => {
    scenes.push({
      id: String(3 + i),
      type: 'feature',
      headline: i === 0 ? 'Why Choose Us?' : 'Key Benefit',
      subtext: feat,
      narration: buildNarration(i === 0 ? 'Why choose us' : 'Key benefit', feat, input.productName),
      duration: 4,
      animation: input.hasImage && i === 0 ? 'kenburns' : 'slide',
    });
  });

  scenes.push(
    {
      id: String(3 + features.length),
      type: 'cta',
      headline: 'Get Started Today',
      subtext: 'Limited time offer — Free shipping on your first order',
      narration: `Get started today with ${input.productName}. Limited time offer. Order now and enjoy free shipping.`,
      duration: 4,
      animation: 'zoom',
    },
    {
      id: String(4 + features.length),
      type: 'outro',
      headline: input.productName,
      subtext: 'AdAutonomy — Autonomous Advertising',
      narration: `${input.productName}. Thank you for watching. Visit us today.`,
      duration: 3,
      animation: 'fade',
    }
  );

  return {
    id: generateId(),
    productName: input.productName,
    productText: input.productText,
    targetMarket: input.targetMarket,
    tagline: `Discover ${input.productName}`,
    scenes,
    totalDuration: scenes.reduce((s, sc) => s + sc.duration, 0),
    musicStyle: 'cinematic-upbeat',
    createdAt: new Date().toISOString(),
  };
}

function normalizeScenes(scenes: VideoScene[], productName: string): VideoScene[] {
  return scenes.map((s, i) => ({
    ...s,
    id: s.id || String(i + 1),
    duration: Math.min(Math.max(s.duration || 4, 3), 6),
    narration:
      s.narration ||
      buildNarration(s.headline, s.subtext, productName),
  }));
}

export async function runVideoAgent(input: VideoAgentInput): Promise<VideoAdScript> {
  const { result, confidence, usedFallback } = await withRetry(
    async () => {
      const prompt = `Create a professional advertisement video script for:
product: ${input.productName}
description: ${input.productText}
target market: ${input.targetMarket || 'general consumers'}
has product image: ${input.hasImage}

Return JSON with: tagline, musicStyle, scenes array.
Each scene must include:
- id, type (intro|product|feature|cta|outro)
- headline (short on-screen title)
- subtext (supporting text, max 2 lines worth)
- narration (full voiceover script, 1-2 natural sentences a narrator would speak aloud)
- duration (3-6 seconds)
- animation (fade|slide|zoom|kenburns — use kenburns only when image is shown)

Include 5-7 scenes with rich context from the product description. Reference the target market. Total 20-30 seconds.`;

      const response = await complete(prompt, { task: 'video' });
      const parsed = parseJSON<{ tagline: string; musicStyle: string; scenes: VideoScene[] }>(response.content);

      await sendMessage('VideoAgent', 'CreativeAgent', 'response', {
        scenes: parsed.scenes.length,
      }, response.confidence);

      const scenes = normalizeScenes(parsed.scenes, input.productName);

      return {
        id: generateId(),
        productName: input.productName,
        productText: input.productText,
        targetMarket: input.targetMarket,
        tagline: parsed.tagline || `Discover ${input.productName}`,
        scenes,
        totalDuration: scenes.reduce((sum, s) => sum + s.duration, 0),
        musicStyle: parsed.musicStyle || 'cinematic-upbeat',
        createdAt: new Date().toISOString(),
      };
    },
    () => fallbackScript(input),
    'VideoAgent'
  );

  updateAgentMemory('VideoAgent', {
    confidence,
    notes: [usedFallback ? 'Fallback video script' : `Generated ${result.scenes.length} scenes with narration`],
  });

  return result;
}
