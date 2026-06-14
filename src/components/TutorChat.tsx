import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Sparkles, User, Brain } from "lucide-react";

type Props = {
  lessonId: string;
  lessonTitle: string;
  confusion?: "low" | "medium" | "high";
};

export function TutorChat({ lessonId, lessonTitle, confusion = "low" }: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => {
          const customKey = typeof window !== "undefined" ? localStorage.getItem("GEMINI_API_KEY") : "";
          return {
            body: { messages, lessonTitle, confusion, custom_api_key: customKey || undefined },
          };
        },
      }),
    [lessonTitle, confusion],
  );

  const { messages, sendMessage, status } = useChat({
    id: `tutor-${lessonId}`,
    transport,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const isBusy = status === "submitted" || status === "streaming";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isBusy) return;
    const text = input.trim();
    setInput("");
    await sendMessage({ text });
  }

  return (
    <div className="glass rounded-2xl flex flex-col h-[520px] transition-all duration-300 hover:border-accent/15 hover:shadow-lg">
      <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/25">
            <Brain className="size-4.5 text-accent animate-pulse" />
          </div>
          <div>
            <div className="font-semibold text-sm">AI Tutor</div>
            <div className="text-[11px] text-muted-foreground">Adapts to your attention · confusion: <span className="font-medium text-accent">{confusion}</span></div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-secondary/50 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground border border-border/40">
          <span className={`size-1.5 rounded-full ${isBusy ? "bg-amber-400 animate-ping" : "bg-emerald-400"}`} />
          {isBusy ? "Thinking" : "Online"}
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-sm text-muted-foreground py-16 text-center max-w-xs mx-auto">
            <div className="size-12 rounded-full bg-secondary/40 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="size-5 text-accent/70" />
            </div>
            <p className="font-medium text-foreground/80 mb-1">Ask the Neuro Tutor anything</p>
            <p className="text-xs text-muted-foreground">It has access to your lesson details and focus level. Try asking: <em className="text-accent/80 block mt-1">"give me a simple analogy"</em></p>
          </div>
        )}
        {messages.map((m: UIMessage) => {
          const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          const mine = m.role === "user";
          return (
            <div key={m.id} className={`flex items-start gap-2.5 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && (
                <div className="size-8 rounded-full bg-accent/15 flex items-center justify-center border border-accent/20 shrink-0 mt-0.5 shadow-sm shadow-accent/5">
                  <Brain className="size-3.5 text-accent" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                mine 
                  ? "bg-primary text-primary-foreground rounded-tr-none border border-primary/20" 
                  : "bg-secondary/40 text-foreground border border-border/30 rounded-tl-none"
              }`}>
                {text || <span className="opacity-60">…</span>}
              </div>
              {mine && (
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/25 shrink-0 mt-0.5 shadow-sm shadow-primary/5">
                  <User className="size-3.5 text-primary" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <form onSubmit={submit} className="border-t border-border/60 p-4 flex gap-2 bg-secondary/10">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          placeholder={isBusy ? "Tutor is thinking…" : "Ask the tutor…"}
          className="flex-1 rounded-md bg-input/50 border border-border/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all" />
        <button disabled={isBusy || !input.trim()}
          className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground glow-primary disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center">
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
