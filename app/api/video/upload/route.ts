import { NextRequest, NextResponse } from 'next/server';
import { uploadVideoFromServer } from '@/lib/supabase/videoStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('video');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Video file required' }, { status: 400 });
    }

    if (!file.type.startsWith('video/') && !file.name.endsWith('.webm')) {
      return NextResponse.json({ error: 'Invalid video file' }, { status: 400 });
    }

    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: 'Video must be under 50MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadVideoFromServer(buffer, file.name, file.type || 'video/webm');

    return NextResponse.json({
      url: result.url,
      path: result.path,
      filename: file.name,
    });
  } catch (err) {
    console.error('[API] Video upload failed:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
