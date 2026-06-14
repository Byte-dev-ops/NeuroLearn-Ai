import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play, CheckCircle2, Clock } from "lucide-react";
import { MOCK_COURSES } from "@/lib/mock-data";
import { toast } from "sonner";

type Lesson = { id: string; title: string; description: string | null; position: number; duration_seconds: number | null; youtube_id: string };
type Course = { id: string; title: string; description: string | null; cover_emoji: string | null; lessons: Lesson[] };
type Progress = Record<string, { last_position: number; completed_at: string | null }>;

export const Route = createFileRoute("/_authenticated/courses")({
  ssr: false,
  head: () => ({ meta: [{ title: "Courses · NeuroLearn AI" }] }),
  component: CoursesPage,
});

function CoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<Progress>({});
  const [loading, setLoading] = useState(true);
  const [customUrl, setCustomUrl] = useState("");

  function handleCustomUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customUrl.trim()) return;
    
    let videoId = "";
    try {
      const url = new URL(customUrl.trim());
      if (url.hostname === "youtu.be") {
        videoId = url.pathname.substring(1);
      } else if (url.hostname.includes("youtube.com")) {
        if (url.pathname.includes("/watch")) {
          videoId = url.searchParams.get("v") || "";
        } else if (url.pathname.includes("/embed/")) {
          videoId = url.pathname.split("/embed/")[1] || "";
        }
      }
    } catch (err) {
      // Simple regex fallback
      const reg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
      const match = customUrl.match(reg);
      if (match) {
        videoId = match[1];
      }
    }
    
    if (videoId) {
      const finalId = videoId;
      setCustomUrl("");
      navigate({
        to: "/learn/$lessonId",
        params: { lessonId: "custom" },
        search: { v: finalId }
      });
    } else {
      toast.error("Invalid YouTube URL. Please make sure it is a valid YouTube link.");
    }
  }

  useEffect(() => {
    (async () => {
      const { data: cs } = await supabase
        .from("courses").select("id, title, description, cover_emoji, lessons(id, title, description, position, duration_seconds, youtube_id)").order("created_at");
      let list = (cs ?? []).map((c) => ({
        ...c,
        lessons: (c.lessons as Lesson[] | null ?? []).slice().sort((a, b) => a.position - b.position),
      })) as Course[];
      
      if (list.length === 0) {
        list = MOCK_COURSES;
      }
      
      setCourses(list);
      const { data: pr } = await supabase.from("lesson_progress").select("lesson_id, last_position, completed_at");
      const map: Progress = {};
      for (const p of pr ?? []) map[p.lesson_id] = { last_position: p.last_position, completed_at: p.completed_at };
      setProgress(map);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground">Loading courses…</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground text-sm mt-1">Pick a lesson. NeuroLearn watches your focus and adapts.</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 transition-all duration-300 hover:border-accent/15 hover:shadow-lg">
        <h3 className="font-semibold text-base mb-1.5 flex items-center gap-2">
          <Play className="size-4 text-accent" /> Play custom video
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Paste any YouTube URL below to load it into the dynamic, attention-aware workspace.</p>
        <form onSubmit={handleCustomUrlSubmit} className="flex gap-2 max-w-2xl">
          <input
            type="text"
            placeholder="https://www.youtube.com/watch?v=..."
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="flex-grow rounded-md bg-input/50 border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground glow-primary hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0 cursor-pointer"
          >
            Load Video
          </button>
        </form>
      </div>

      {courses.map((c) => (
        <section key={c.id} className="glass rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="text-4xl">{c.cover_emoji}</div>
            <div>
              <h2 className="text-xl font-semibold">{c.title}</h2>
              <p className="text-sm text-muted-foreground">{c.description}</p>
            </div>
          </div>
          <ul className="divide-y divide-border/60">
            {c.lessons.map((l) => {
              const p = progress[l.id];
              const done = !!p?.completed_at;
              return (
                <li key={l.id}>
                  <Link to="/learn/$lessonId" params={{ lessonId: l.id }}
                    className="flex items-center gap-4 py-3 hover:bg-secondary/40 rounded-md px-2 -mx-2">
                    <div className="size-9 rounded-full bg-primary/15 grid place-items-center text-xs font-semibold">
                      {l.position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{l.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                        <span className="inline-flex items-center gap-1"><Clock className="size-3" />{Math.round((l.duration_seconds ?? 0) / 60)} min</span>
                        {p && !done && <span>Resume at {Math.floor(p.last_position / 60)}:{String(p.last_position % 60).padStart(2, "0")}</span>}
                      </div>
                    </div>
                    {done ? <CheckCircle2 className="size-5 text-accent" /> : <Play className="size-5 text-muted-foreground" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
