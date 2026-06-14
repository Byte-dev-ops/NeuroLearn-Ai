import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateQuiz, submitQuiz } from "@/lib/learning.functions";
import { toast } from "sonner";
import { Sparkles, CheckCircle2, XCircle, RotateCw } from "lucide-react";

type Q = {
  type: "mcq" | "short";
  question: string;
  options?: string[];
  difficulty?: string;
};
type Result = { score: number; correct: number; total: number; confusion: "low" | "medium" | "high"; next_action: string };

export function QuizPanel({ lessonId, onResult }: { lessonId: string; onResult?: (r: Result) => void }) {
  const gen = useServerFn(generateQuiz);
  const sub = useServerFn(submitQuiz);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Q[] | null>(null);
  const [answers, setAnswers] = useState<Array<number | string>>([]);
  const [result, setResult] = useState<Result | null>(null);

  async function start() {
    setLoading(true); setResult(null);
    try {
      const customKey = typeof window !== "undefined" ? localStorage.getItem("GEMINI_API_KEY") : "";
      const { questions } = await gen({ data: { lesson_id: lessonId, custom_api_key: customKey || undefined } });
      setQuestions(questions as Q[]);
      setAnswers(new Array(questions.length).fill(""));
    } catch (e) {
      toast.error((e as Error).message || "Failed to generate quiz");
    } finally { setLoading(false); }
  }

  async function send() {
    if (!questions) return;
    setLoading(true);
    try {
      const customKey = typeof window !== "undefined" ? localStorage.getItem("GEMINI_API_KEY") : "";
      const r = await sub({ data: { lesson_id: lessonId, answers, custom_api_key: customKey || undefined } }) as Result;
      setResult(r);
      onResult?.(r);
    } catch (e) {
      toast.error((e as Error).message || "Failed to submit");
    } finally { setLoading(false); }
  }

  function reset() { setQuestions(null); setAnswers([]); setResult(null); }

  if (!questions) {
    return (
      <div className="glass rounded-2xl p-8 text-center transition-all duration-300 hover:border-accent/15 hover:shadow-lg">
        <div className="size-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4 border border-accent/20">
          <Sparkles className="size-5 text-accent animate-pulse" />
        </div>
        <h3 className="font-semibold text-lg">Check your understanding</h3>
        <p className="text-sm text-muted-foreground mt-1.5 mb-6 max-w-sm mx-auto">Generate a custom AI quiz based on this lesson to test your retention and earn course progress.</p>
        <button onClick={start} disabled={loading}
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground glow-primary hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60">
          {loading ? "Generating tailoring questions…" : "Generate quiz"}
        </button>
      </div>
    );
  }

  if (result) {
    const tone = result.confusion === "low" ? "text-emerald-300" : result.confusion === "medium" ? "text-amber-300" : "text-rose-300";
    return (
      <div className="glass rounded-2xl p-6 transition-all duration-300 hover:border-accent/15 hover:shadow-lg">
        <div className="flex items-center justify-between mb-5 border-b border-border/40 pb-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Sparkles className="size-4 text-accent" /> Assessment Result
          </h3>
          <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 bg-secondary/60 hover:bg-secondary px-2.5 py-1.5 rounded-md transition-all">
            <RotateCw className="size-3" /> Retake Quiz
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <Stat label="Score" value={`${result.score}%`} />
          <Stat label="Correct" value={`${result.correct}/${result.total}`} />
          <Stat label="Confusion" value={result.confusion} valueClass={tone} />
        </div>
        <div className="text-sm text-muted-foreground bg-secondary/20 rounded-xl p-4 border border-border/40">
          <span className="font-semibold text-foreground block mb-0.5">Recommendation:</span>
          {result.next_action === "unlock_next" && "Outstanding work! You've mastered this material. The next lesson is now unlocked."}
          {result.next_action === "extra_practice" && "You've got a solid foundation. A quick practice review will help cement this concept."}
          {result.next_action === "repeat_lesson" && "This topic is tricky. We recommend repeating the lesson video and using the AI tutor chat below to ask clarifying questions."}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-6 transition-all duration-300 hover:border-accent/15 hover:shadow-lg">
      <div className="border-b border-border/40 pb-3">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Sparkles className="size-4 text-accent animate-pulse" /> Live Lesson Assessment
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">Answer the questions below. Grading is event-driven and logged to your profile.</p>
      </div>
      {questions.map((q, i) => {
        const difficultyColor = q.difficulty === "easy" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : q.difficulty === "medium" ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-rose-500/10 text-rose-300 border-rose-500/20";
        return (
          <div key={i} className="space-y-3 p-4 bg-secondary/10 rounded-xl border border-border/30">
            <div className="text-sm font-medium flex items-start justify-between gap-3">
              <span>{i + 1}. {q.question}</span>
              <span className={`text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border shrink-0 ${difficultyColor}`}>{q.difficulty}</span>
            </div>
            {q.type === "mcq" ? (
              <div className="grid gap-2">
                {(q.options ?? []).map((opt, j) => (
                  <label key={j} className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm cursor-pointer hover:bg-secondary/60 hover:border-border transition-all ${answers[i] === j ? "bg-primary/10 border-primary/40 text-primary-foreground font-medium" : "border-border/60 text-muted-foreground"}`}>
                    <input type="radio" name={`q-${i}`} className="accent-primary size-4 shrink-0"
                      checked={answers[i] === j}
                      onChange={() => setAnswers((a) => { const c = [...a]; c[i] = j; return c; })} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea rows={3} className="w-full rounded-lg bg-input/50 border border-border/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                placeholder="Type your explanation here. The AI will scan for key concepts and understanding..." value={typeof answers[i] === "string" ? (answers[i] as string) : ""}
                onChange={(e) => setAnswers((a) => { const c = [...a]; c[i] = e.target.value; return c; })} />
            )}
          </div>
        );
      })}
      <div className="flex justify-end border-t border-border/40 pt-4">
        <button onClick={send} disabled={loading}
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground glow-primary hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60">
          {loading ? "AI grading in progress…" : "Submit Answers"}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold capitalize ${valueClass}`}>{value}</div>
    </div>
  );
}

export { CheckCircle2, XCircle };
