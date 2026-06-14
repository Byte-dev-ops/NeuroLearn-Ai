import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Eye, Sparkles, Activity, Zap, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NeuroLearn AI — Emotion-Aware Adaptive Learning" },
      { name: "description", content: "Brain-inspired, event-driven learning that adapts to your attention, comprehension, and confusion in real time." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen aurora-bg">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/20 grid place-items-center glow-primary">
            <Brain className="size-4 text-accent" />
          </div>
          <span className="font-display font-semibold tracking-tight">NeuroLearn AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/auth" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground glow-primary hover:opacity-90">
            Get started
          </Link>
        </div>
      </nav>

      <header className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground mb-6">
          <span className="pulse-dot" /> Brain-inspired event-driven learning intelligence
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          Learning that <span className="text-accent">watches you back</span>.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          NeuroLearn AI tracks attention, detects confusion, and adapts every lesson in real time —
          like a tutor sitting next to you, only quieter.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/auth" className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground glow-primary hover:opacity-90">
            Start a lesson
          </Link>
          <a href="#features" className="rounded-md glass px-6 py-3 text-sm font-medium hover:bg-secondary">
            How it works
          </a>
        </div>
      </header>

      <section id="features" className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-5">
        {[
          { icon: Eye, title: "Real-time attention", body: "Webcam, focus, and inactivity fuse into a single 0–100 score. Drops pause the lesson." },
          { icon: Activity, title: "Confusion detection", body: "Quiz misses, rewatches, pauses, and slow answers compute a confusion signal." },
          { icon: Sparkles, title: "Adaptive AI tutor", body: "On confusion: a simpler explanation, an analogy, a worked example, a tiny drill." },
          { icon: Zap, title: "Neuromorphic by design", body: "Heavy analysis fires only on events — Face Lost, Quiz Failed, Distraction — not every frame." },
          { icon: MessageCircle, title: "Always-on chat", body: "Ask the tutor anything mid-lesson. It knows what you're watching and how you're doing." },
          { icon: Brain, title: "Personal learning path", body: "<60% → repeat. 60–80% → practice. >80% → unlock next. Your route, not a fixed track." },
        ].map((f, i) => (
          <div key={i} className="glass rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:border-accent/30 hover:shadow-xl hover:shadow-accent/5 group">
            <div className="size-10 rounded-lg bg-primary/15 grid place-items-center mb-4 transition-colors group-hover:bg-primary/25">
              <f.icon className="size-5 text-accent group-hover:scale-110 transition-transform duration-300" />
            </div>
            <h3 className="font-semibold mb-1 group-hover:text-accent transition-colors duration-300">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border/40 py-10 text-center text-xs text-muted-foreground/60 max-w-7xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} NeuroLearn AI. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-accent transition-colors">Privacy Policy</a>
            <span>·</span>
            <a href="#" className="hover:text-accent transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
