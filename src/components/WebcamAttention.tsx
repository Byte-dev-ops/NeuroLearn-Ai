import { useEffect, useRef, useState } from "react";
import { Check, AlertTriangle, ChevronDown, ChevronUp, Volume2, Camera, Tv } from "lucide-react";

type Factors = {
  facePresent: boolean;
  tabFocused: boolean;
  recentActivity: boolean;
  motionLevel: number;
  brightness: number;
  audioLevel?: number;
  speakingDetected?: boolean;
};

export type AttentionEvent =
  | { type: "FaceLost" }
  | { type: "FaceFound" }
  | { type: "FocusLost" }
  | { type: "FocusReturned" }
  | { type: "SpeakingDetected" }
  | { type: "DistractionDetected"; reason: string };

type Props = {
  active: boolean;
  onScore: (score: number, factors: Factors) => void;
  onEvent?: (e: AttentionEvent) => void;
};

// Premium webcam + microphone attention monitor with real-time proctoring overlay.
export function WebcamAttention({ active, onScore, onEvent }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastFrame = useRef<ImageData | null>(null);
  const lastActivity = useRef<number>(Date.now());
  const facePresent = useRef<boolean>(true);
  const tabFocused = useRef<boolean>(typeof document !== "undefined" ? document.visibilityState === "visible" : true);
  const detectorRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [status, setStatus] = useState<"idle" | "starting" | "on" | "denied">("idle");
  const [showDetails, setShowDetails] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [facePresentState, setFacePresentState] = useState(true);
  const [faceCount, setFaceCount] = useState(1);
  const [tabFocusedState, setTabFocusedState] = useState(true);
  const [currentScore, setCurrentScore] = useState(100);

  // user activity heartbeat
  useEffect(() => {
    const bump = () => { lastActivity.current = Date.now(); };
    window.addEventListener("mousemove", bump);
    window.addEventListener("keydown", bump);
    window.addEventListener("click", bump);
    const onVis = () => {
      const focused = document.visibilityState === "visible";
      if (focused !== tabFocused.current) {
        tabFocused.current = focused;
        setTabFocusedState(focused);
        onEvent?.(focused ? { type: "FocusReturned" } : { type: "FocusLost" });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", () => { tabFocused.current = false; setTabFocusedState(false); onEvent?.({ type: "FocusLost" }); });
    window.addEventListener("focus", () => { tabFocused.current = true; setTabFocusedState(true); onEvent?.({ type: "FocusReturned" }); });
    return () => {
      window.removeEventListener("mousemove", bump);
      window.removeEventListener("keydown", bump);
      window.removeEventListener("click", bump);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [onEvent]);

  // start/stop webcam & audio stream
  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    let audioContext: AudioContext | null = null;
    setStatus("starting");
    (async () => {
      try {
        // Request camera and microphone access
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 320, height: 240 }, 
          audio: true 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        
        // Initialize Web Audio API Analyser
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContext = new AudioContextClass();
          audioContextRef.current = audioContext;
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          analyserRef.current = analyser;
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);
        }

        // FaceDetector API (Chromium experimental)
        const FD = (window as any).FaceDetector;
        if (FD) {
          try { detectorRef.current = new FD({ fastMode: true, maxDetectedFaces: 1 }); } catch { detectorRef.current = null; }
        }
        
        setStatus("on");
        interval = setInterval(() => analyze(false), 700);
      } catch (err) {
        console.error("Camera/Mic access denied, starting simulated demo mode:", err);
        setStatus("denied");
        interval = setInterval(() => analyze(true), 700);
      }
    })();
    return () => {
      if (interval) clearInterval(interval);
      stream?.getTracks().forEach((t) => t.stop());
      if (audioContext) {
        audioContext.close().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  async function analyze(simulated = false) {
    let brightness = 0.8;
    let motion = 0.1;
    let facesDetected = 1;
    let audioLevel = 0.02;
    let voiceDetected = false;

    if (!simulated && videoRef.current && canvasRef.current) {
      const v = videoRef.current; const c = canvasRef.current;
      if (v.videoWidth > 0) {
        try {
          const ctx = c.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            c.width = 80; c.height = 60;
            ctx.drawImage(v, 0, 0, c.width, c.height);
            const frame = ctx.getImageData(0, 0, c.width, c.height);

            // brightness avg
            let sum = 0;
            for (let i = 0; i < frame.data.length; i += 4) sum += frame.data[i] + frame.data[i + 1] + frame.data[i + 2];
            brightness = sum / (frame.data.length / 4) / 3 / 255;

            // motion diff vs last
            if (lastFrame.current) {
              const d = lastFrame.current.data;
              let diff = 0;
              for (let i = 0; i < frame.data.length; i += 16) diff += Math.abs(frame.data[i] - d[i]);
              motion = Math.min(1, diff / (frame.data.length / 16) / 60);
            }
            lastFrame.current = frame;

            // face presence counting
            if (detectorRef.current) {
              try {
                const dets = await detectorRef.current.detect(v);
                facesDetected = dets ? dets.length : 0;
              } catch {
                facesDetected = (brightness > 0.1 && motion < 0.9) ? 1 : 0;
              }
            } else {
              facesDetected = (brightness > 0.1 && motion < 0.9) ? 1 : 0;
            }
          }
        } catch (e) {
          console.warn("Failed to capture or analyze camera frame:", e);
        }
      }
    }

    // Apply mock overrides if present
    if (typeof window !== "undefined") {
      if ((window as any).__mockFaceCount !== undefined) {
        facesDetected = (window as any).__mockFaceCount;
      }
      if ((window as any).__mockVolume !== undefined) {
        audioLevel = (window as any).__mockVolume;
      }
    }

    setFaceCount(facesDetected);
    const faceNow = (facesDetected === 1);
    
    if (faceNow !== facePresent.current) {
      facePresent.current = faceNow;
      setFacePresentState(faceNow);
      if (facesDetected === 0) {
        onEvent?.({ type: "FaceLost" });
      } else if (facesDetected > 1) {
        onEvent?.({ type: "DistractionDetected", reason: "Multiple faces detected" });
      } else {
        onEvent?.({ type: "FaceFound" });
      }
    }

    if (typeof window !== "undefined" && (window as any).__mockSpeaking !== undefined) {
      voiceDetected = (window as any).__mockSpeaking;
    } else {
      if (!simulated && analyserRef.current) {
        try {
          const bufferLength = analyserRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteTimeDomainData(dataArray);

          let sumSquare = 0;
          for (let i = 0; i < bufferLength; i++) {
            const normalized = (dataArray[i] - 128) / 128;
            sumSquare += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquare / bufferLength);
          audioLevel = Number(rms.toFixed(2));
          voiceDetected = rms > 0.07;
        } catch (e) {
          console.warn("Failed to read audio analyser data:", e);
        }
      }
    }

    setCurrentVolume(audioLevel);
    setSpeaking(voiceDetected);
    if (voiceDetected) {
      onEvent?.({ type: "SpeakingDetected" });
    }

    const inactiveMs = Date.now() - lastActivity.current;
    const recent = inactiveMs < 60_000;

    // Score calculation
    let score = 100;
    if (!facePresent.current) score -= 45;
    if (!tabFocused.current) score -= 35;
    if (voiceDetected) score -= 30;
    if (!recent) score -= 20;
    if (brightness < 0.06) score -= 15;
    score = Math.max(0, Math.min(100, score));
    setCurrentScore(score);

    onScore(score, {
      facePresent: facePresent.current,
      tabFocused: tabFocused.current,
      recentActivity: recent,
      motionLevel: Number(motion.toFixed(2)),
      brightness: Number(brightness.toFixed(2)),
      audioLevel,
      speakingDetected: voiceDetected,
    });
  }

  // Toggle picture-in-picture mode for video element
  async function togglePip() {
    if (videoRef.current && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (e) {
        console.error("Picture-in-Picture failed:", e);
      }
    }
  }

  const hasAnomaly = !facePresentState || !tabFocusedState || speaking;
  const showMonitorUI = status === "on" || status === "denied";

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/80 bg-black/40 shadow-xl transition-all duration-300 hover:shadow-2xl">
      {showMonitorUI && (
        <div className={`px-4 py-2.5 flex items-center justify-between text-white text-xs font-semibold select-none transition-colors duration-300 ${
          hasAnomaly ? "bg-rose-600 animate-pulse" : "bg-emerald-650 bg-[rgb(0,168,89)]"
        }`}>
          <div className="flex items-center gap-1.5">
            {hasAnomaly ? (
              <>
                <AlertTriangle className="size-4 animate-bounce" />
                <span>Detected Anomaly</span>
              </>
            ) : (
              <>
                <Check className="size-4" />
                <span>All Clear</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowDetails(!showDetails)} 
              className="hover:bg-white/10 p-1 rounded transition-colors cursor-pointer flex items-center gap-0.5"
              title="Toggle anomaly details"
            >
              {showDetails ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
            {status === "on" && (
              <button 
                onClick={togglePip} 
                className="hover:bg-white/10 p-1 rounded transition-colors cursor-pointer"
                title="Picture in Picture"
              >
                <Tv className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="relative">
        {status === "denied" ? (
          <div className="w-full aspect-video flex flex-col items-center justify-center bg-black/75 border border-white/5 relative overflow-hidden select-none p-6">
            <div className="absolute inset-0 bg-radial-[circle_at_center,rgba(139,92,246,0.08)_0%,transparent_60%] pointer-events-none" />
            <div className="relative size-16 mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-accent/20 animate-ping opacity-60" style={{ animationDuration: "3s" }} style={{ animationDuration: "3s" }} />
              <div className="absolute inset-2 rounded-full border border-accent/30 animate-pulse" style={{ animationDuration: "2s" }} />
              <div className="size-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center shadow-lg shadow-accent/5">
                <Camera className="size-5 text-accent animate-pulse" />
              </div>
            </div>
            <span className="text-xs font-semibold text-white/80 tracking-wide uppercase">Simulated Proctoring Active</span>
            <span className="text-[10px] text-white/45 mt-1 max-w-[220px] text-center">Webcam/mic blocked. Using simulated mock devices for demo.</span>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            muted 
            playsInline 
            className="w-full aspect-video object-cover bg-black/40" 
            style={{ transform: "scaleX(-1)" }} 
          />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {showMonitorUI && (
          <>
            {/* Float badge for score multiplier */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white/95 text-xs font-bold font-mono px-3 py-1.5 rounded-lg border border-white/10 select-none shadow-md">
              {(currentScore / 100).toFixed(2)}
            </div>

            {/* Anomaly details panel overlay on the right side */}
            {(showDetails || hasAnomaly) && (
              <div className="absolute top-0 right-0 h-full w-[46%] bg-black/80 backdrop-blur-md border-l border-white/10 p-3.5 flex flex-col justify-start text-[11px] text-white/90 select-none transition-all duration-300">
                <div className="text-amber-400 font-bold mb-3 uppercase tracking-wider text-[10px] border-b border-white/15 pb-1">
                  Anomaly Details
                </div>
                <ul className="space-y-2.5">
                  <li className="flex justify-between items-center gap-2">
                    <span className="text-white/60">Faces:</span>
                    <span className={`font-semibold ${faceCount === 1 ? "text-emerald-400" : "text-rose-400"}`}>
                      {faceCount === 1 
                        ? "1 (Detected)" 
                        : faceCount > 1 
                          ? `${faceCount} (Multiple)` 
                          : "0 (None)"}
                    </span>
                  </li>
                  <li className="flex justify-between items-center gap-2">
                    <span className="text-white/60">Speaking:</span>
                    <span className={`font-semibold ${speaking ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
                      {speaking ? "Detected" : "None"}
                    </span>
                  </li>
                  <li className="flex justify-between items-center gap-2">
                    <span className="text-white/60">Focus State:</span>
                    <span className={`font-semibold ${tabFocusedState ? "text-emerald-400" : "text-rose-400"}`}>
                      {tabFocusedState ? "Focused" : "Unfocused"}
                    </span>
                  </li>
                  <li className="flex justify-between items-center gap-2 border-t border-white/10 pt-2 mt-1">
                    <span className="text-white/60 flex items-center gap-1">
                      <Volume2 className="size-3 text-white/40" /> Sound:
                    </span>
                    <span className="font-mono font-semibold">{Math.round(currentVolume * 100)}%</span>
                  </li>
                </ul>
              </div>
            )}
          </>
        )}

        {status === "starting" && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            starting monitor…
          </div>
        )}
      </div>
    </div>
  );
}
