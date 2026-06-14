import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";
import { Brain, Flame, Target, Activity } from "lucide-react";
import { MOCK_LESSONS } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Dashboard · NeuroLearn AI" }] }),
  component: Dashboard,
});

type Attempt = { score: number; created_at: string; lesson_id: string; confusion_level: string };
type Attention = { score: number; created_at: string };
type Lesson = { id: string; title: string; course_id: string; position: number };

function Dashboard() {
  const [name, setName] = useState("Learner");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [attention, setAttention] = useState<Attention[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: p } = await supabase.from("profiles").select("display_name").eq("id", u.user.id).maybeSingle();
        if (p?.display_name) setName(p.display_name);
      }
      const { data: a } = await supabase.from("quiz_attempts").select("score, created_at, lesson_id, confusion_level").order("created_at", { ascending: true }).limit(50);
      setAttempts((a ?? []) as Attempt[]);
      const { data: at } = await supabase.from("attention_logs").select("score, created_at").order("created_at", { ascending: true }).limit(120);
      setAttention((at ?? []) as Attention[]);
      const { data: ls } = await supabase.from("lessons").select("id, title, course_id, position");
      setLessons((ls && ls.length ? ls : MOCK_LESSONS) as Lesson[]);

      // streak: consecutive distinct UTC days with at least one attempt or attention log
      const days = new Set<string>();
      for (const r of [...(a ?? []), ...(at ?? [])]) days.add(new Date(r.created_at).toISOString().slice(0, 10));
      let s = 0;
      for (let i = 0; ; i++) {
        const d = new Date(); d.setUTCDate(d.getUTCDate() - i);
        if (days.has(d.toISOString().slice(0, 10))) s++; else break;
      }
      setStreak(s);
    })();
  }, []);

  const avgAttention = attention.length ? Math.round(attention.reduce((s, x) => s + x.score, 0) / attention.length) : 0;
  const avgScore = attempts.length ? Math.round(attempts.reduce((s, x) => s + Number(x.score), 0) / attempts.length) : 0;
  const efficiency = Math.round((avgAttention * 0.4 + avgScore * 0.6));

  const attChart = attention.slice(-30).map((a, i) => ({ x: i, score: a.score }));
  const scoreChart = attempts.slice(-20).map((a, i) => ({ x: i, score: Number(a.score), confusion: a.confusion_level }));

  // weak topics: lessons where avg score < 70
  const byLesson = new Map<string, { sum: number; n: number }>();
  for (const a of attempts) {
    const e = byLesson.get(a.lesson_id) ?? { sum: 0, n: 0 };
    e.sum += Number(a.score); e.n += 1; byLesson.set(a.lesson_id, e);
  }
  const weak = lessons
    .map((l) => ({ ...l, avg: byLesson.has(l.id) ? Math.round(byLesson.get(l.id)!.sum / byLesson.get(l.id)!.n) : null }))
    .filter((l) => l.avg !== null && l.avg < 70)
    .slice(0, 4);

  // next recommendation: first lesson with no attempt
  const attemptedSet = new Set(attempts.map((a) => a.lesson_id));
  const next = lessons.sort((a, b) => a.position - b.position).find((l) => !attemptedSet.has(l.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Hi {name} 👋</h1>
          <p className="text-muted-foreground text-sm">Your brain-inspired learning snapshot.</p>
        </div>
        {next && (
          <Link to="/learn/$lessonId" params={{ lessonId: next.id }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground glow-primary">
            Resume learning →
          </Link>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Activity} label="Attention" value={avgAttention + "%"} hint="Avg across sessions" />
        <Stat icon={Target} label="Quiz score" value={avgScore + "%"} hint={`${attempts.length} attempts`} />
        <Stat icon={Brain} label="Efficiency" value={efficiency + "%"} hint="Attention × Mastery" />
        <Stat icon={Flame} label="Streak" value={streak + "d"} hint="Active days in a row" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Attention trend">
          {attChart.length === 0 ? <Empty label="No attention data yet — start a lesson." /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={attChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="x" hide />
                <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="oklch(0.78 0.16 200)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card title="Quiz performance">
          {scoreChart.length === 0 ? <Empty label="Take a quiz to see your scores." /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="x" hide />
                <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                <Bar dataKey="score" fill="oklch(0.62 0.22 295)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card title="Weak topics">
        {weak.length === 0 ? <Empty label="No weak topics yet — keep going!" /> : (
          <ul className="divide-y divide-border/60">
            {weak.map((w) => (
              <li key={w.id} className="flex items-center justify-between py-3">
                <span className="text-sm">{w.title}</span>
                <Link to="/learn/$lessonId" params={{ lessonId: w.id }} className="text-xs rounded-md bg-secondary px-3 py-1.5 hover:bg-secondary/70">
                  Review ({w.avg}%)
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: string; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 group">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
        <Icon className="size-4 text-accent group-hover:scale-110 transition-transform duration-300" />
      </div>
      <div className="text-3xl font-bold mt-2 font-display text-foreground group-hover:text-accent transition-colors">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-6 transition-all duration-300 hover:border-accent/15 hover:shadow-xl hover:shadow-accent/2">
      <h3 className="font-semibold text-lg mb-4 text-foreground/90 border-b border-border/40 pb-2">{title}</h3>
      {children}
    </div>
  );
}
function Empty({ label }: { label: string }) {
  return <div className="text-sm text-muted-foreground py-16 text-center">{label}</div>;
}
