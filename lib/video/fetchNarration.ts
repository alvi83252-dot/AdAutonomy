import type { VideoAdScript } from '@/lib/types';
import { getNarrationText } from '@/lib/video/narration';

/** Fetch TTS audio blobs per scene (OpenAI when configured) */
export async function fetchSceneAudioBlobs(script: VideoAdScript): Promise<(Blob | null)[]> {
  const results: (Blob | null)[] = [];

  for (const scene of script.scenes) {
    const text = getNarrationText(scene);
    try {
      const res = await fetch('/api/video/narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.audio) {
        const binary = atob(data.audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        results.push(new Blob([bytes], { type: 'audio/mpeg' }));
      } else {
        results.push(null);
      }
    } catch {
      results.push(null);
    }
  }

  return results;
}
