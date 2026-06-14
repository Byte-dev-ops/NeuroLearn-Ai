import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Brain, LayoutDashboard, BookOpen, LogOut } from "lucide-react";
import { toast } from "sonner";
import { DemoSandbox } from "@/components/DemoSandbox";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthGate,
});

function AuthGate() {
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState(data.session ? "in" : "out"));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setState(s ? "in" : "out"));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (state === "out") navigate({ to: "/auth" });
  }, [state, navigate]);

  if (state !== "in") {
    return <div className="min-h-screen aurora-bg grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  }
  return <Shell />;
}

function Shell() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    toast.message("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/courses", label: "Courses", icon: BookOpen },
  ] as const;

  return (
    <div className="min-h-screen aurora-bg">
      <header className="border-b border-border/60 backdrop-blur sticky top-0 z-30 bg-background/70">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-14">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/20 grid place-items-center glow-primary">
              <Brain className="size-4 text-accent" />
            </div>
            <span className="font-display font-semibold">NeuroLearn AI</span>
          </Link>
          <nav className="flex items-center gap-1">
            {links.map((l) => {
              const active = path.startsWith(l.to);
              return (
                <Link key={l.to} to={l.to}
                  className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 ${active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <l.icon className="size-4" /> {l.label}
                </Link>
              );
            })}
            <button onClick={signOut}
              className="ml-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
              <LogOut className="size-4" /> Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8"><Outlet /></main>
      <DemoSandbox />
    </div>
  );
}
