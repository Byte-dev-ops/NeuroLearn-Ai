import { useEffect, useRef } from "react";

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady?: () => void; }
}

type Props = {
  videoId: string;
  startSeconds?: number;
  paused?: boolean;
  onTick?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
};

let apiPromise: Promise<void> | null = null;
function loadYT(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve();
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve();
  });
  return apiPromise;
}

export function YouTubeLessonPlayer({ videoId, startSeconds = 0, paused, onTick, onEnded }: Props) {
  const mount = useRef<HTMLDivElement | null>(null);
  const player = useRef<any>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadYT().then(() => {
      if (cancelled || !mount.current) return;
      player.current = new window.YT.Player(mount.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, start: Math.floor(startSeconds) },
        events: {
          onStateChange: (e: any) => {
            if (e.data === window.YT.PlayerState.ENDED) onEnded?.();
          },
        },
      });
    });
    tickRef.current = setInterval(() => {
      const p = player.current;
      if (p && typeof p.getCurrentTime === "function") {
        try {
          const t = p.getCurrentTime();
          const d = p.getDuration ? p.getDuration() : 0;
          if (typeof t === "number" && !isNaN(t)) onTick?.(t, d);
        } catch { /* ignore */ }
      }
    }, 1000);
    return () => {
      cancelled = true;
      if (tickRef.current) clearInterval(tickRef.current);
      try { player.current?.destroy?.(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    const p = player.current;
    if (!p || typeof p.pauseVideo !== "function") return;
    if (paused) { try { p.pauseVideo(); } catch { /* ignore */ } }
  }, [paused]);

  return (
    <div className="aspect-video w-full rounded-xl overflow-hidden bg-black ring-1 ring-border/60">
      <div ref={mount} className="w-full h-full" />
    </div>
  );
}
