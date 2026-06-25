import type { VideoAdScript } from '@/lib/types';
import { computeContainFit, loadImageElement, type ImageFitBox } from '@/lib/video/imageUtils';
import { createBackgroundMusic, scheduleNarrationTracks } from '@/lib/video/audioTrack';
import { getNarrationText } from '@/lib/video/narration';
import { fetchSceneAudioBlobs } from '@/lib/video/fetchNarration';

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;

const IMAGE_ZONE: ImageFitBox = { x: 100, y: 80, w: WIDTH - 200, h: HEIGHT * 0.48 };
const TEXT_ZONE_Y = HEIGHT * 0.58;

type ProgressCallback = (progress: number, scene: string) => void;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = 4): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function drawGradientBg(ctx: CanvasRenderingContext2D, hue: number, progress: number) {
  const g = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  g.addColorStop(0, `hsl(${hue}, 55%, 12%)`);
  g.addColorStop(0.5, `hsl(${hue + 30}, 45%, 8%)`);
  g.addColorStop(1, `hsl(${hue + 60}, 50%, 6%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.globalAlpha = 0.12;
  ctx.beginPath();
  ctx.arc(WIDTH * 0.85, HEIGHT * 0.15, 180 + progress * 40, 0, Math.PI * 2);
  ctx.fillStyle = `hsl(${hue + 50}, 60%, 45%)`;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawImageFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  progress: number,
  useKenBurns: boolean
) {
  const kenBurn = useKenBurns ? 1 + progress * 0.05 : 1;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(IMAGE_ZONE.x - 4, IMAGE_ZONE.y - 4, IMAGE_ZONE.w + 8, IMAGE_ZONE.h + 8);

  ctx.fillStyle = '#0d0d14';
  ctx.fillRect(IMAGE_ZONE.x, IMAGE_ZONE.y, IMAGE_ZONE.w, IMAGE_ZONE.h);

  const fit = computeContainFit(img.naturalWidth || img.width, img.naturalHeight || img.height, IMAGE_ZONE, kenBurn);

  ctx.save();
  ctx.beginPath();
  ctx.rect(IMAGE_ZONE.x, IMAGE_ZONE.y, IMAGE_ZONE.w, IMAGE_ZONE.h);
  ctx.clip();

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, fit.x, fit.y, fit.w, fit.h);
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 2;
  ctx.strokeRect(IMAGE_ZONE.x, IMAGE_ZONE.y, IMAGE_ZONE.w, IMAGE_ZONE.h);
}

function drawSubtitleBar(ctx: CanvasRenderingContext2D, narration: string, opacity: number) {
  if (!narration || opacity <= 0) return;

  ctx.font = '24px system-ui, sans-serif';
  const lines = wrapText(ctx, narration, WIDTH - 200, 2);
  const barH = 36 + lines.length * 32;

  ctx.globalAlpha = opacity * 0.92;
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(80, HEIGHT - barH - 40, WIDTH - 160, barH);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  lines.forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2, HEIGHT - barH - 12 + i * 32);
  });
  ctx.globalAlpha = 1;
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: VideoAdScript['scenes'][0],
  progress: number,
  productImage: HTMLImageElement | null,
  showImage: boolean
) {
  const hue = scene.type === 'cta' ? 280 : scene.type === 'intro' ? 240 : 260;
  drawGradientBg(ctx, hue, progress);

  const hasImage = productImage && showImage;
  if (hasImage) {
    drawImageFrame(ctx, productImage, progress, scene.animation === 'kenburns');
  }

  let textY = hasImage ? TEXT_ZONE_Y + 40 : HEIGHT * 0.35;
  let opacity = 1;
  let offsetX = 0;
  let textScale = 1;

  if (scene.animation === 'fade') {
    opacity = progress < 0.12 ? progress / 0.12 : progress > 0.88 ? (1 - progress) / 0.12 : 1;
  } else if (scene.animation === 'slide') {
    offsetX = (1 - Math.min(progress / 0.25, 1)) * -100;
    opacity = Math.min(progress / 0.18, 1);
  } else if (scene.animation === 'zoom') {
    textScale = 0.85 + progress * 0.15;
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(WIDTH / 2 + offsetX, textY);
  ctx.scale(textScale, textScale);
  ctx.translate(-(WIDTH / 2 + offsetX), -textY);

  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 16;
  ctx.fillText(scene.headline, WIDTH / 2 + offsetX, textY);

  ctx.font = '30px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.shadowBlur = 8;
  const lines = wrapText(ctx, scene.subtext, WIDTH - 240, 3);
  lines.forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2 + offsetX, textY + 56 + i * 40);
  });
  ctx.shadowBlur = 0;
  ctx.restore();

  if (scene.type === 'cta') {
    const btnW = 300;
    const btnH = 58;
    const btnX = (WIDTH - btnW) / 2;
    const btnY = hasImage ? HEIGHT * 0.82 : HEIGHT * 0.62;
    const pulse = 1 + Math.sin(progress * Math.PI * 3) * 0.02;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(WIDTH / 2, btnY + btnH / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-WIDTH / 2, -(btnY + btnH / 2));

    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY);
    btnGrad.addColorStop(0, '#6366f1');
    btnGrad.addColorStop(1, '#a855f7');
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(btnX, btnY, btnW, btnH, 14);
    else ctx.rect(btnX, btnY, btnW, btnH);
    ctx.fill();

    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('Shop Now →', WIDTH / 2, btnY + 38);
    ctx.restore();
  }

  const narration = getNarrationText(scene);
  const subOpacity = progress < 0.1 ? progress / 0.1 : progress > 0.9 ? (1 - progress) / 0.1 : 1;
  drawSubtitleBar(ctx, narration, subOpacity);

  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.textAlign = 'right';
  ctx.fillText('AdAutonomy', WIDTH - 36, HEIGHT - 20);
}

function sceneShowsImage(scene: VideoAdScript['scenes'][0], hasImage: boolean): boolean {
  if (!hasImage) return false;
  return scene.type === 'product' || scene.type === 'feature' || scene.animation === 'kenburns';
}

export async function composeAdVideo(
  script: VideoAdScript,
  imageDataUrl?: string,
  onProgress?: ProgressCallback
): Promise<{ blob: Blob; hasAiVoice: boolean }> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false })!;

  let productImage: HTMLImageElement | null = null;
  if (imageDataUrl) {
    try {
      productImage = await loadImageElement(imageDataUrl);
    } catch {
      productImage = null;
    }
  }

  const hasImage = !!productImage;
  const totalDuration = script.scenes.reduce((s, sc) => s + sc.duration, 0);

  const audioContext = new AudioContext();
  const audioDest = audioContext.createMediaStreamDestination();
  await createBackgroundMusic(audioContext, audioDest, totalDuration, script.musicStyle);

  onProgress?.(0.05, 'Generating voiceover...');
  const narrationBlobs = await fetchSceneAudioBlobs(script);
  const hasAiVoice = narrationBlobs.some((b) => b !== null);
  await scheduleNarrationTracks(audioContext, audioDest, script, narrationBlobs);

  const canvasStream = canvas.captureStream(FPS);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks(),
  ]);

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : 'video/webm';

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 4_000_000,
    audioBitsPerSecond: 128_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const totalFrames = script.scenes.reduce((sum, s) => sum + s.duration * FPS, 0);
  let frameIndex = 0;

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      audioContext.close().catch(() => {});
      resolve({ blob: new Blob(chunks, { type: mimeType }), hasAiVoice });
    };
    recorder.onerror = () => reject(new Error('Video recording failed'));

    recorder.start(100);
    const frameDelay = 1000 / FPS;

    let sceneIndex = 0;
    let sceneFrame = 0;
    const sceneFrameCounts = script.scenes.map((s) => s.duration * FPS);

    function renderFrame() {
      if (sceneIndex >= script.scenes.length) {
        setTimeout(() => recorder.stop(), 500);
        return;
      }

      const scene = script.scenes[sceneIndex];
      const sceneTotal = sceneFrameCounts[sceneIndex];
      const progress = sceneTotal > 0 ? sceneFrame / sceneTotal : 0;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      drawScene(ctx, scene, progress, productImage, sceneShowsImage(scene, hasImage));

      frameIndex++;
      onProgress?.(0.1 + (frameIndex / totalFrames) * 0.9, scene.headline);

      sceneFrame++;
      if (sceneFrame >= sceneTotal) {
        sceneIndex++;
        sceneFrame = 0;
      }

      setTimeout(renderFrame, frameDelay);
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => setTimeout(renderFrame, 100));
    } else {
      setTimeout(renderFrame, 100);
    }
  });
}

export function downloadVideo(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
