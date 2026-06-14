import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { logAttention, logEvent, upsertProgress } from "@/lib/learning.functions";
import { WebcamAttention, type AttentionEvent } from "@/components/WebcamAttention";
import { YouTubeLessonPlayer } from "@/components/YouTubeLessonPlayer";
import { QuizPanel } from "@/components/QuizPanel";
import { TutorChat } from "@/components/TutorChat";
import { AlertTriangle, Brain, Eye, Zap, ArrowLeft } from "lucide-react";
import { MOCK_LESSONS } from "@/lib/mock-data";

type Lesson = { id: string; title: string; description: string | null; youtube_id: string; course_id: string; position: number; duration_seconds: number | null };
type Next = { id: string } | null;

export const Route = createFileRoute("/_authenticated/learn/$lessonId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Lesson · NeuroLearn AI" }] }),
  component: LearnPage,
});

const ATTENTION_THRESHOLD = 45;
const WARNING_THRESHOLD = 60;

function LearnPage() {
  const { lessonId } = Route.useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [nextLesson, setNextLesson] = useState<Next>(null);
  const [resumeAt, setResumeAt] = useState(0);
  const [webcamOn, setWebcamOn] = useState(false);
  const [attention, setAttention] = useState(100);
  const [warning, setWarning] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [confusion, setConfusion] = useState<"low" | "medium" | "high">("low");
  const [recentEvents, setRecentEvents] = useState<Array<{ t: number; label: string }>>([]);
  const watchedRef = useRef(0);
  const lastPosRef = useRef(0);
  const attHistory = useRef<number[]>([]);

  const att = useServerFn(logAttention);
  const ev = useServerFn(logEvent);
  const prog = useServerFn(upsertProgress);

  useEffect(() => {
    (async () => {
      let l = null;
      if (lessonId === "custom") {
        const searchParams = new URLSearchParams(window.location.search);
        const v = searchParams.get("v") || "Fqp7OskS08Y";
        l = {
          id: "custom",
          title: "Custom Video Lesson",
          description: "Custom video loaded from user-provided link.",
          youtube_id: v,
          course_id: "custom",
          position: 0,
          duration_seconds: 0
        };
      } else {
        try {
          const { data } = await supabase.from("lessons").select("*").eq("id", lessonId).single();
          l = data;
        } catch (e) {
          console.warn("Could not fetch lesson from database, trying mock data:", e);
        }

        if (!l) {
          const mockL = MOCK_LESSONS.find(m => m.id === lessonId);
          if (mockL) {
            l = mockL;
          }
        }
      }

      if (!l) {
        navigate({ to: "/courses" });
        return;
      }
      setLesson(l as Lesson);

      let nxt = null;
      if (lessonId !== "custom") {
        try {
          const { data } = await supabase
            .from("lessons").select("id").eq("course_id", (l as Lesson).course_id)
            .gt("position", (l as Lesson).position).order("position").limit(1).maybeSingle();
          nxt = data;
        } catch (e) {
          console.warn("Could not fetch next lesson from database, trying mock data:", e);
        }

        if (!nxt) {
          const currentMockIndex = MOCK_LESSONS.findIndex(m => m.id === lessonId);
          if (currentMockIndex !== -1 && currentMockIndex + 1 < MOCK_LESSONS.length) {
            const nextMock = MOCK_LESSONS[currentMockIndex + 1];
            if (nextMock.course_id === (l as Lesson).course_id) {
              nxt = { id: nextMock.id };
            }
          }
        }
      }
      setNextLesson(nxt ? { id: nxt.id as string } : null);

      let lastPos = 0;
      try {
        const { data: p } = await supabase.from("lesson_progress").select("last_position").eq("lesson_id", lessonId).maybeSingle();
        if (p?.last_position) lastPos = p.last_position;
      } catch (e) {}
      setResumeAt(lastPos);
    })();
  }, [lessonId, navigate]);

  // throttled DB writes
  const attentionLogger = useRef<number>(0);
  function handleScore(score: number, factors: any) {
    setAttention(score);
    attHistory.current.push(score);
    if (attHistory.current.length > 600) attHistory.current.shift();

    const now = Date.now();
    if (now - attentionLogger.current > 10_000) {
      attentionLogger.current = now;
      if (lessonId !== "custom") {
        att({ data: { lesson_id: lessonId, score, factors } }).catch(() => {});
      }
    }

    if (score < ATTENTION_THRESHOLD) {
      if (!paused) {
        setPaused(true);
        setWarning("Lesson paused — let's refocus.");
        pushEvent("Paused: low attention");
        if (lessonId !== "custom") {
          ev({ data: { lesson_id: lessonId, event_type: "DistractionDetected", payload: { score, factors } } }).catch(() => {});
        }
      }
    } else if (score < WARNING_THRESHOLD) {
      setWarning("Attention dropping — eyes on the screen.");
    } else {
      // Only unpause automatically if speaking is not also warning
      setWarning(null);
      if (paused && score > 75 && warning !== "Lesson paused — speaking detected.") setPaused(false);
    }
  }

  function handleEvent(e: AttentionEvent) {
    const label = e.type === "DistractionDetected" ? `Distraction (${(e as any).reason ?? ""})` : e.type;
    pushEvent(label);
    
    if (e.type === "SpeakingDetected") {
      if (!paused) {
        setPaused(true);
        setWarning("Lesson paused — speaking detected.");
        pushEvent("Paused: speaking detected");
      }
    }

    if (lessonId !== "custom") {
      ev({ data: { lesson_id: lessonId, event_type: e.type, payload: e } }).catch(() => {});
    }
  }

  function pushEvent(label: string) {
    setRecentEvents((r) => [{ t: Date.now(), label }, ...r].slice(0, 6));
  }

  function onTick(currentTime: number) {
    const prev = lastPosRef.current;
    if (currentTime > prev) watchedRef.current += Math.min(2, currentTime - prev);
    lastPosRef.current = currentTime;
    if (Math.floor(currentTime) % 15 === 0) {
      const avg = attHistory.current.length
        ? Math.round(attHistory.current.reduce((s, x) => s + x, 0) / attHistory.current.length)
        : undefined;
      if (lessonId !== "custom") {
        prog({ data: {
          lesson_id: lessonId,
          last_position: Math.floor(currentTime),
          watched_seconds: Math.floor(watchedRef.current),
          attention_avg: avg,
        } }).catch(() => {});
      }
    }
  }

  function onEnded() {
    if (lessonId !== "custom") {
      prog({ data: {
        lesson_id: lessonId,
        last_position: Math.floor(lastPosRef.current),
        watched_seconds: Math.floor(watchedRef.current),
        completed: true,
      } }).catch(() => {});
    }
    pushEvent("Lesson completed");
  }

  const attentionColor = useMemo(() => attention >= 70 ? "text-emerald-300" : attention >= 45 ? "text-amber-300" : "text-rose-300", [attention]);

  if (!lesson) return <div className="text-sm text-muted-foreground">Loading lesson…</div>;

  return (
    <div className="space-y-6">
      <Link to="/courses" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="size-3.5" /> All courses
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Lesson {lesson.position}</div>
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl mt-1">{lesson.description}</p>
        </div>
        <button onClick={() => setWebcamOn((v) => !v)}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-all duration-300 ${
            webcamOn 
              ? "bg-accent text-accent-foreground glow-accent hover:opacity-90 hover:scale-[1.02]" 
              : "bg-secondary hover:bg-secondary/80 hover:text-foreground text-muted-foreground hover:scale-[1.02]"
          }`}>
          {webcamOn ? "Attention: ON" : "Enable attention monitor"}
        </button>
      </div>

      {warning && (
        <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-3 ${paused ? "bg-rose-500/10 text-rose-200 border border-rose-500/30" : "bg-amber-500/10 text-amber-200 border border-amber-500/30"}`}>
          <AlertTriangle className="size-4" />
          <span className="flex-1">{warning}</span>
          {paused && (
            <button onClick={() => { setPaused(false); setWarning(null); }} className="rounded-md bg-white/10 px-3 py-1 text-xs hover:bg-white/20">
              I'm back — resume
            </button>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <YouTubeLessonPlayer videoId={lesson.youtube_id} startSeconds={resumeAt} paused={paused} onTick={onTick} onEnded={onEnded} />
          <QuizPanel lessonId={lesson.id} onResult={(r) => {
            setConfusion(r.confusion);
            if (r.next_action === "unlock_next" && nextLesson) {
              // surfaced; user can click "Next lesson" below
            }
          }} />
          {nextLesson && (
            <Link to="/learn/$lessonId" params={{ lessonId: nextLesson.id }}
              className="block text-center rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground glow-primary">
              Next lesson →
            </Link>
          )}
        </div>

        <aside className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground mb-2">
              <span className="inline-flex items-center gap-1.5"><Eye className="size-3.5" /> Attention</span>
              <span className={`font-semibold ${attentionColor}`}>{attention}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${attention}%`, background: attention >= 70 ? "oklch(0.78 0.16 200)" : attention >= 45 ? "oklch(0.78 0.18 65)" : "oklch(0.65 0.24 25)" }} />
            </div>
            <div className="mt-4">
              {webcamOn ? (
                <WebcamAttention active={webcamOn} onScore={handleScore} onEvent={handleEvent} />
              ) : (
                <div className="text-xs text-muted-foreground bg-secondary/30 rounded-md px-3 py-6 text-center">
                  Enable the monitor to track focus. Heavy analysis only fires on events — Face Lost, Focus Lost, Distraction.
                </div>
              )}
            </div>
          </div>

          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-3">
              <Zap className="size-3.5" /> Event stream
            </div>
            {recentEvents.length === 0 ? (
              <div className="text-xs text-muted-foreground">Quiet so far. Spikes appear here.</div>
            ) : (
              <ul className="space-y-2 text-xs">
                {recentEvents.map((e, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span>{e.label}</span>
                    <span className="text-muted-foreground">{new Date(e.t).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass rounded-2xl p-4 text-xs text-muted-foreground flex gap-2">
            <Brain className="size-4 text-accent shrink-0 mt-0.5" />
            <p>Neuromorphic mode: intensive analysis triggers only on events, not every frame — keeping CPU and battery use low.</p>
          </div>
        </aside>
      </div>

      <TutorChat lessonId={lesson.id} lessonTitle={lesson.title} confusion={confusion} />
    </div>
  );
}
