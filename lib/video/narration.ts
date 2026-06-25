import type { VideoAdScript } from '@/lib/types';

let voicesCache: SpeechSynthesisVoice[] = [];

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      voicesCache = voices;
      resolve(pickBestVoice(voices));
      return;
    }
    speechSynthesis.onvoiceschanged = () => {
      voicesCache = speechSynthesis.getVoices();
      resolve(pickBestVoice(voicesCache));
    };
    setTimeout(() => resolve(pickBestVoice(speechSynthesis.getVoices())), 500);
  });
}

function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const preferred = voices.filter(
    (v) =>
      v.lang.startsWith('en') &&
      (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural'))
  );
  return preferred.length > 0 ? preferred : voices.filter((v) => v.lang.startsWith('en'));
}

export function getNarrationText(scene: VideoAdScript['scenes'][0]): string {
  return scene.narration || `${scene.headline}. ${scene.subtext}`;
}

/** Speak narration synced to video playback */
export class NarrationController {
  private script: VideoAdScript;
  private sceneStarts: number[] = [];
  private currentScene = -1;
  private enabled = true;
  private voice: SpeechSynthesisVoice | null = null;

  constructor(script: VideoAdScript) {
    this.script = script;
    let t = 0;
    this.sceneStarts = script.scenes.map((s) => {
      const start = t;
      t += s.duration;
      return start;
    });
  }

  async init() {
    const voices = await loadVoices();
    this.voice = voices[0] || null;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) speechSynthesis.cancel();
  }

  syncToTime(currentTime: number) {
    if (!this.enabled) return;

    let sceneIdx = 0;
    for (let i = this.sceneStarts.length - 1; i >= 0; i--) {
      if (currentTime >= this.sceneStarts[i]) {
        sceneIdx = i;
        break;
      }
    }

    if (sceneIdx !== this.currentScene) {
      this.currentScene = sceneIdx;
      this.speakScene(sceneIdx);
    }
  }

  private speakScene(index: number) {
    speechSynthesis.cancel();
    const scene = this.script.scenes[index];
    if (!scene) return;

    const utterance = new SpeechSynthesisUtterance(getNarrationText(scene));
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    if (this.voice) utterance.voice = this.voice;
    speechSynthesis.speak(utterance);
  }

  stop() {
    speechSynthesis.cancel();
    this.currentScene = -1;
  }
}

/** Split product description into feature bullets for extra scenes */
export function extractFeatureBullets(text: string, max = 3): string[] {
  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
  if (sentences.length >= max) return sentences.slice(0, max);

  const commaParts = text
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  const combined = Array.from(new Set([...sentences, ...commaParts]));
  return combined.slice(0, max);
}
