'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NarrationController } from '@/lib/video/narration';
import type { VideoAdScript } from '@/lib/types';

interface VideoPlayerProps {
  src: string;
  script: VideoAdScript;
  hasAiVoice?: boolean;
}

export function VideoPlayer({ src, script, hasAiVoice = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const narratorRef = useRef<NarrationController | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(!hasAiVoice);

  useEffect(() => {
    const controller = new NarrationController(script);
    controller.init();
    narratorRef.current = controller;
    return () => controller.stop();
  }, [script]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (!voiceEnabled || hasAiVoice) return;
      narratorRef.current?.syncToTime(video.currentTime);
    };

    const onPlay = () => {
      if (voiceEnabled && !hasAiVoice) {
        narratorRef.current?.syncToTime(video.currentTime);
      }
    };

    const onPause = () => narratorRef.current?.stop();
    const onEnded = () => narratorRef.current?.stop();

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [voiceEnabled, hasAiVoice]);

  const toggleVoice = useCallback(() => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    narratorRef.current?.setEnabled(next);
    if (!next) narratorRef.current?.stop();
  }, [voiceEnabled]);

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
        <video
          ref={videoRef}
          src={src}
          controls
          autoPlay
          className="w-full h-full object-contain"
          playsInline
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={toggleVoice}>
          {voiceEnabled ? (
            <><Volume2 className="w-4 h-4 mr-2" /> Voiceover On</>
          ) : (
            <><VolumeX className="w-4 h-4 mr-2" /> Voiceover Off</>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          {hasAiVoice
            ? 'AI voiceover + background music embedded in video'
            : voiceEnabled
              ? 'Browser narrator speaking · background music in video'
              : 'Background music in video · toggle narrator for voice'}
        </p>
      </div>
    </div>
  );
}
