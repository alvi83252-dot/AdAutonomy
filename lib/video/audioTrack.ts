import type { VideoAdScript } from '@/lib/types';

const DEFAULT_BG_URL = '/audio/background.mp3';
const BG_VOLUME = 0.22;
const VOICE_VOLUME = 0.88;

function getBackgroundAudioUrl(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_VIDEO_BACKGROUND_AUDIO || DEFAULT_BG_URL;
  }
  return DEFAULT_BG_URL;
}

/** Load background MP3 from public/audio and mix into the exported video */
export async function createBackgroundMusic(
  audioContext: AudioContext,
  destination: MediaStreamAudioDestinationNode,
  durationSec: number,
  _style?: string
): Promise<{ stop: () => void }> {
  const url = getBackgroundAudioUrl();

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await audioContext.decodeAudioData(arrayBuffer);

    const bgGain = audioContext.createGain();
    bgGain.gain.value = BG_VOLUME;
    bgGain.connect(destination);

    const now = audioContext.currentTime;
    const stopAt = now + durationSec + 0.3;
    const sources: AudioBufferSourceNode[] = [];

    if (buffer.duration >= durationSec) {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(bgGain);
      source.start(now, 0, durationSec);
      source.stop(stopAt);
      sources.push(source);
    } else {
      let offset = 0;
      while (offset < durationSec) {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(bgGain);
        const playDuration = Math.min(buffer.duration, durationSec - offset);
        source.start(now + offset, 0, playDuration);
        source.stop(now + offset + playDuration + 0.05);
        sources.push(source);
        offset += buffer.duration;
      }
    }

    return {
      stop: () => {
        sources.forEach((s) => {
          try {
            s.stop();
          } catch {
            /* already stopped */
          }
        });
        bgGain.gain.setValueAtTime(0, audioContext.currentTime);
      },
    };
  } catch (err) {
    console.warn('[Audio] Background file unavailable, using silent fallback:', err);
    return { stop: () => {} };
  }
}

/** Schedule decoded TTS audio buffers per scene into the mix */
export async function scheduleNarrationTracks(
  audioContext: AudioContext,
  destination: MediaStreamAudioDestinationNode,
  script: VideoAdScript,
  audioBlobs: (Blob | null)[]
): Promise<void> {
  const voiceGain = audioContext.createGain();
  voiceGain.gain.value = VOICE_VOLUME;
  voiceGain.connect(destination);

  let offset = 0;
  for (let i = 0; i < script.scenes.length; i++) {
    const blob = audioBlobs[i];
    if (blob) {
      try {
        const buffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(voiceGain);
        source.start(audioContext.currentTime + offset);
      } catch {
        /* skip bad audio */
      }
    }
    offset += script.scenes[i].duration;
  }
}
