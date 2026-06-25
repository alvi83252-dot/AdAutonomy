import { NextRequest, NextResponse } from 'next/server';
import { runVideoAgent } from '@/lib/agents/videoAgent';

export async function POST(req: NextRequest) {
  try {
    const { productName, productText, targetMarket, hasImage } = await req.json();

    if (!productName?.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    if (!productText?.trim() && !hasImage) {
      return NextResponse.json({ error: 'Provide product text or upload an image' }, { status: 400 });
    }

    const script = await runVideoAgent({
      productName: productName.trim(),
      productText: (productText || '').trim(),
      targetMarket: (targetMarket || '').trim(),
      hasImage: !!hasImage,
    });

    return NextResponse.json({ script });
  } catch (err) {
    console.error('[API] Video generation failed:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
