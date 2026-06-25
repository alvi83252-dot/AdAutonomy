import type { LLMResponse } from './provider';

const TEMPLATES: Record<string, (prompt: string) => string> = {
  brief: (p) => {
    const product = extractField(p, 'product') || 'Innovative Product';
    const market = extractField(p, 'market') || 'Tech-savvy professionals';
    const goal = extractField(p, 'goal') || 'Drive brand awareness';
    return JSON.stringify({
      summary: `Campaign for ${product} targeting ${market}`,
      objectives: [goal, 'Increase engagement by 25%', 'Build brand loyalty'],
      keyMessages: [`${product} solves real problems`, 'Trusted by industry leaders'],
      tone: 'professional yet approachable',
      constraints: ['No misleading claims', 'GDPR compliant', 'Inclusive language'],
      budget: 5000,
      timeline: '4 weeks',
    });
  },
  creative: (p) => {
    const product = extractField(p, 'product') || 'Product';
    return JSON.stringify([
      {
        headline: `Transform Your Day with ${product}`,
        body: `Discover how ${product} revolutionizes the way you work. Join thousands of satisfied customers.`,
        cta: 'Get Started Free',
        variant: 'A',
        imagePrompt: `Modern minimalist ad for ${product}, cinematic lighting, premium feel`,
      },
      {
        headline: `${product}: Built for Tomorrow`,
        body: `The future is here. Experience cutting-edge innovation designed for your success.`,
        cta: 'Learn More',
        variant: 'B',
        imagePrompt: `Futuristic product showcase for ${product}, dark mode aesthetic`,
      },
      {
        headline: `Why Everyone Loves ${product}`,
        body: `Rated 4.9/5 by users. See what makes us different and start your journey today.`,
        cta: 'Try It Now',
        variant: 'C',
        imagePrompt: `Social proof collage for ${product}, warm colors, testimonial style`,
      },
    ]);
  },
  audience: () =>
    JSON.stringify([
      { name: 'LinkedIn Professionals', platform: 'LinkedIn', reach: 45000, costPerClick: 2.5, rationale: 'B2B decision makers' },
      { name: 'Instagram Lifestyle', platform: 'Instagram', reach: 120000, costPerClick: 0.8, rationale: 'Visual engagement' },
      { name: 'Google Search Intent', platform: 'Google Ads', reach: 80000, costPerClick: 1.2, rationale: 'High purchase intent' },
      { name: 'Twitter/X Tech Community', platform: 'Twitter', reach: 35000, costPerClick: 1.0, rationale: 'Early adopters' },
    ]),
  simulation: () =>
    JSON.stringify({
      impressions: 285000,
      clicks: 8550,
      conversions: 428,
      ctr: 3.0,
      cpc: 1.45,
      roas: 3.2,
      projectedRevenue: 21400,
    }),
  safety: () =>
    JSON.stringify([
      { severity: 'low', category: 'Language', message: 'Consider adding accessibility alt-text for images', resolved: false },
      { severity: 'medium', category: 'Claims', message: 'Review "thousands of customers" claim for substantiation', resolved: false },
    ]),
  feedback: () =>
    JSON.stringify([
      { sentiment: 'positive', comment: 'Love the clean design and clear value proposition', source: 'Wassist Survey' },
      { sentiment: 'neutral', comment: 'Pricing not immediately clear in the ad', source: 'Focus Group' },
      { sentiment: 'positive', comment: 'Strong CTA, would click through', source: 'A/B Test Panel' },
    ]),
  investor: () =>
    JSON.stringify({
      totalSpend: 4800,
      projectedROI: 3.2,
      breakEvenDays: 18,
      riskScore: 0.28,
      recommendation: 'Proceed with phased rollout. Strong ROI potential with manageable risk.',
      highlights: ['3.2x projected ROAS', 'Diversified channel mix', 'Compliance cleared'],
    }),
  video: (p) => {
    const product = extractField(p, 'product') || 'Amazing Product';
    const desc = extractField(p, 'description') || 'Revolutionary innovation for modern life';
    const market = extractField(p, 'target market') || 'modern consumers';
    return JSON.stringify({
      tagline: `${product} — Redefine What's Possible`,
      musicStyle: 'cinematic-upbeat',
      scenes: [
        {
          id: '1', type: 'intro', headline: product, subtext: `Designed for ${market}`,
          narration: `Introducing ${product}. Designed especially for ${market}.`,
          duration: 4, animation: 'fade',
        },
        {
          id: '2', type: 'product', headline: 'Meet Your New Favorite',
          subtext: desc.slice(0, 120),
          narration: `Meet your new favorite. ${desc.slice(0, 200)}`,
          duration: 5, animation: 'kenburns',
        },
        {
          id: '3', type: 'feature', headline: 'Premium Quality',
          subtext: 'Engineered with precision. Built to exceed expectations.',
          narration: 'Premium quality you can trust. Engineered with precision and built to exceed your expectations.',
          duration: 4, animation: 'slide',
        },
        {
          id: '4', type: 'feature', headline: 'Loved by Customers',
          subtext: 'Join thousands of satisfied users worldwide',
          narration: 'Join thousands of satisfied customers worldwide who have already made the switch.',
          duration: 4, animation: 'kenburns',
        },
        {
          id: '5', type: 'cta', headline: 'Shop Now',
          subtext: 'Free shipping on your first order — Limited time',
          narration: `Shop ${product} now and get free shipping on your first order. This is a limited time offer.`,
          duration: 4, animation: 'zoom',
        },
        {
          id: '6', type: 'outro', headline: product, subtext: 'AdAutonomy Autonomous Ads',
          narration: `${product}. Thank you for watching.`,
          duration: 3, animation: 'fade',
        },
      ],
    });
  },
};

function extractField(prompt: string, field: string): string | null {
  const regex = new RegExp(`${field}[:\\s]+([^\\n,]+)`, 'i');
  const match = prompt.match(regex);
  return match ? match[1].trim() : null;
}

export async function mockComplete(prompt: string, task?: string): Promise<LLMResponse> {
  await delay(300 + Math.random() * 500);
  const taskKey = task || detectTask(prompt);
  const template = TEMPLATES[taskKey] || TEMPLATES.brief;
  return {
    content: template(prompt),
    model: 'mock-llm-v1',
    tokensUsed: 150,
    confidence: 0.85 + Math.random() * 0.1,
  };
}

function detectTask(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('creative') || lower.includes('ad copy')) return 'creative';
  if (lower.includes('audience') || lower.includes('channel')) return 'audience';
  if (lower.includes('simulat') || lower.includes('performance')) return 'simulation';
  if (lower.includes('safety') || lower.includes('compliance')) return 'safety';
  if (lower.includes('feedback') || lower.includes('customer')) return 'feedback';
  if (lower.includes('investor') || lower.includes('financial')) return 'investor';
  if (lower.includes('video') || lower.includes('advertisement')) return 'video';
  return 'brief';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
