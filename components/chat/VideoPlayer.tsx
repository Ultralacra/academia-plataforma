"use client";

import React, { useState, useRef } from "react";
import { Play } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  className?: string;
  selectMode?: boolean;
  onSelect?: () => void;
}

export default function VideoPlayer({
  src,
  className,
  selectMode,
  onSelect,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayClick = (e: React.MouseEvent) => {
    if (selectMode) {
      onSelect?.();
      return;
    }
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  return (
    <div className={`relative ${className} bg-black/5 overflow-hidden`}>
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        controls
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onClick={(e) => {
          if (selectMode) {
            e.preventDefault();
            e.stopPropagation();
            onSelect?.();
          }
        }}
      />

      {!isPlaying && !selectMode && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/10 cursor-pointer z-10 hover:bg-black/20 transition-colors"
          onClick={handlePlayClick}
        >
          <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-[2px] flex items-center justify-center hover:bg-black/50 transition-all hover:scale-105 shadow-lg border border-white/20">
            <Play className="w-6 h-6 text-white fill-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
}
