import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in · NeuroLearn AI" }] }),
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name || email.split("@")[0] }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created — you're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setLoading(false); }
  }

  async function google() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="min-h-screen aurora-bg grid place-items-center px-4">
      <div className="w-full max-w-md glass rounded-2xl p-8">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <div className="size-8 rounded-lg bg-primary/20 grid place-items-center glow-primary">
            <Brain className="size-4 text-accent" />
          </div>
          <span className="font-display font-semibold">NeuroLearn AI</span>
        </Link>
        <h1 className="text-2xl font-bold mb-1">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "signin" ? "Sign in to resume learning." : "Start a lesson in under a minute."}
        </p>

        <button onClick={google} className="w-full rounded-md glass py-2.5 text-sm font-medium hover:bg-secondary mb-4">
          Continue with Google
        </button>
        <div className="relative my-4 text-center text-xs text-muted-foreground">
          <span className="bg-background px-2 relative z-10">or</span>
          <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <input className="w-full rounded-md bg-input/50 border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <input type="email" required className="w-full rounded-md bg-input/50 border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required minLength={8} className="w-full rounded-md bg-input/50 border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button disabled={loading} type="submit"
            className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground glow-primary hover:opacity-90 disabled:opacity-60">
            {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-4">
          {mode === "signin" ? "No account? Create one" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
