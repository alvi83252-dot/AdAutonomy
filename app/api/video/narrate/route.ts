import { NextRequest, NextResponse } from 'next/server';

/** Generate TTS audio for a narration line (OpenAI when available) */
export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && process.env.LLM_PROVIDER === 'openai') {
      try {
        const res = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: text.slice(0, 4096),
            voice: 'nova',
            response_format: 'mp3',
          }),
        });

        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          return NextResponse.json({ audio: base64, format: 'mp3', source: 'openai' });
        }
      } catch {
        /* fall through */
      }
    }

    return NextResponse.json({ audio: null, source: 'browser', message: 'Use browser voiceover on playback' });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
