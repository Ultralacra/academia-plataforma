"use client";
import React from "react";

export default function AudioBubble({
  src,
  isMine,
  timeLabel,
}: {
  src: string;
  isMine: boolean;
  timeLabel?: string;
}) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [dur, setDur] = React.useState(0);
  const [t, setT] = React.useState(0);
  const idRef = React.useRef(
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  React.useEffect(() => {
    const onExternalPlay = (ev: any) => {
      try {
        const otherId = ev?.detail?.id;
        if (otherId && otherId !== idRef.current) {
          if (!audioRef.current) return;
          audioRef.current.pause();
          setPlaying(false);
        }
      } catch {}
    };
    window.addEventListener("chat:audio:play", onExternalPlay as any);
    return () =>
      window.removeEventListener("chat:audio:play", onExternalPlay as any);
  }, []);

  React.useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onLoaded = () => setDur(isFinite(a.duration) ? a.duration : 0);
    const onTime = () => setT(a.currentTime || 0);
    const onEnd = () => {
      setPlaying(false);
      setT(0);
    };
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      try {
        window.dispatchEvent(
          new CustomEvent("chat:audio:play", {
            detail: { id: idRef.current },
          })
        );
      } catch {}
      a.play().then(
        () => setPlaying(true),
        () => setPlaying(false)
      );
    }
  };

  const pct = dur > 0 ? Math.min(1, Math.max(0, t / dur)) : 0;
  const mmss = (sec: number) => {
    const s = Math.floor(Math.max(0, sec));
    const m = Math.floor(s / 60);
    const r = String(s % 60).padStart(2, "0");
    return `${m}:${r}`;
  };

  const bars = React.useMemo(() => {
    const base = [6, 10, 8, 12, 9, 14, 7, 11, 6, 10, 8, 12];
    const arr: number[] = [];
    while (arr.length < 24) arr.push(...base);
    return arr.slice(0, 24);
  }, []);

  const activeCount = Math.round(bars.length * pct);

  return (
    <div
      className={`flex items-center gap-3 rounded-md ${
        isMine ? "bg-[#cfe9ba]" : "bg-white/60"
      } px-2 py-1 w-[336px] h-[50px]`}
    >
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <button
        type="button"
        onClick={toggle}
        className={`h-7 w-7 rounded-full grid place-items-center ${
          isMine ? "bg-[#128C7E] text-white" : "bg-gray-200 text-gray-700"
        }`}
        aria-label={playing ? "Pausar audio" : "Reproducir audio"}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"></rect>
            <rect x="14" y="4" width="4" height="16" rx="1"></rect>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M8 5v14l11-7z"></path>
          </svg>
        )}
      </button>
      <div className="flex-1">
        <div className="flex items-end gap-2">
          <div className="flex-1 flex items-end gap-[2px] h-6 overflow-hidden">
            {bars.map((h, i) => (
              <div
                key={i}
                className={`w-[2px] rounded-full ${
                  i < activeCount
                    ? isMine
                      ? "bg-[#128C7E]"
                      : "bg-[#128C7E]"
                    : "bg-gray-300"
                } transition-[background-color]`}
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
        </div>
        <div className="mt-0.5 text-[11px] text-gray-600 flex items-center justify-between">
          <span>{mmss(dur || 0)}</span>
          {timeLabel ? (
            <span className="text-right text-gray-500">{timeLabel}</span>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  );
}
