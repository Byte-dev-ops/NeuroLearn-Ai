import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { MOCK_LESSONS } from "@/lib/mock-data";

const QuizQuestion = z.object({
  type: z.enum(["mcq", "short"]),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correct_index: z.number().int().optional(),
  expected_keywords: z.array(z.string()).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});
const QuizSchema = z.object({ questions: z.array(QuizQuestion).min(3).max(6) });

function getMockQuestions(title: string, description: string) {
  return [
    {
      type: "mcq",
      question: `What is the primary topic of the lesson: "${title}"?`,
      options: [
        "Introduction to the core terminology and concepts",
        "Advanced optimization algorithms and architectures",
        "History and future predictions of the technology",
        "None of the above"
      ],
      correct_index: 0,
      difficulty: "easy"
    },
    {
      type: "mcq",
      question: `Based on: "${description || "this lesson"}", which of the following is correct?`,
      options: [
        "It outlines key foundational rules and processes",
        "It is completely unrelated to the title",
        "It is designed only for advanced experts",
        "It requires expensive proprietary hardware"
      ],
      correct_index: 0,
      difficulty: "medium"
    },
    {
      type: "mcq",
      question: "How does the system dynamically adjust in real time?",
      options: [
        "By polling the user every 10 seconds with popups",
        "By adapting content based on attention and performance metrics",
        "By requiring the user to manually select their confusion level",
        "By restarting the lesson whenever the user blinks"
      ],
      correct_index: 1,
      difficulty: "medium"
    },
    {
      type: "mcq",
      question: "What is a benefit of event-driven neuromorphic analysis?",
      options: [
        "It performs heavy calculations only when a state change (event) occurs",
        "It runs on every pixel of every video frame constantly",
        "It disables the camera to save bandwidth",
        "It runs entirely offline without internet"
      ],
      correct_index: 0,
      difficulty: "hard"
    },
    {
      type: "short",
      question: `Explain how the concepts in "${title}" could be applied to solve real-world problems.`,
      expected_keywords: ["apply", "system", "real", "world", "learning", "process"],
      difficulty: "medium"
    }
  ];
}

const GenInput = z.object({
  lesson_id: z.string().uuid().or(z.literal("custom")),
  custom_api_key: z.string().optional(),
});

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => GenInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    
    // Try to load cached quiz from DB
    try {
      const { data: cached } = await supabase
        .from("quizzes").select("questions").eq("lesson_id", data.lesson_id).maybeSingle();
      if (cached?.questions) return { questions: cached.questions as z.infer<typeof QuizSchema>["questions"] };
    } catch (dbErr) {
      console.warn("Could not load cached quiz:", dbErr);
    }

    // Resolve lesson info safely
    let lesson: { title: string; description: string | null } | null = null;
    if (data.lesson_id === "custom") {
      lesson = { title: "Custom Video Lesson", description: "Custom video loaded from user-provided link." };
    } else {
      try {
        const { data: dbLesson } = await supabase
          .from("lessons").select("title, description").eq("id", data.lesson_id).single();
        lesson = dbLesson;
      } catch (dbErr) {
        console.warn("Could not load lesson from DB:", dbErr);
      }

      if (!lesson) {
        const mockL = MOCK_LESSONS.find(m => m.id === data.lesson_id);
        if (mockL) {
          lesson = { title: mockL.title, description: mockL.description };
        } else {
          lesson = { title: "Selected Lesson Topic", description: "Learn key concepts and test your understanding." };
        }
      }
    }

    const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || data.custom_api_key;
    if (!key) {
      const mockQuestions = getMockQuestions(lesson.title, lesson.description ?? "");
      return { questions: mockQuestions };
    }

    try {
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      const { generateText, Output } = await import("ai");
      const google = createGoogleGenerativeAI({ apiKey: key });

      const { output } = await generateText({
        model: google("gemini-2.5-flash"),
        output: Output.object({ schema: QuizSchema }),
        prompt: `Create a 5-question quiz for the lesson "${lesson.title}". Description: ${lesson.description ?? ""}.
Mix 4 multiple-choice (4 options each, set correct_index 0-3) and 1 short-answer (provide expected_keywords).
Vary difficulty. Keep questions tight and unambiguous.`,
      });

      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("quizzes").upsert({
          lesson_id: data.lesson_id,
          questions: output.questions,
        }, { onConflict: "lesson_id" });
      } catch (dbErr) {
        console.warn("Failed to cache generated quiz in database:", dbErr);
      }

      return { questions: output.questions };
    } catch (err) {
      console.error("Failed to generate AI quiz, falling back to mock:", err);
      return { questions: getMockQuestions(lesson.title, lesson.description ?? "") };
    }
  });

const SubmitInput = z.object({
  lesson_id: z.string().uuid().or(z.literal("custom")),
  answers: z.array(z.union([z.number().int(), z.string()])),
  custom_api_key: z.string().optional(),
});

export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => SubmitInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    
    let questions: z.infer<typeof QuizSchema>["questions"] | null = null;
    
    // Try to load cached questions from DB
    try {
      const { data: quiz } = await supabase
        .from("quizzes").select("questions").eq("lesson_id", data.lesson_id).maybeSingle();
      if (quiz?.questions) {
        questions = quiz.questions as z.infer<typeof QuizSchema>["questions"];
      }
    } catch (dbErr) {
      console.warn("Could not load quiz questions from DB on submit:", dbErr);
    }

    // If not found in DB, dynamically regenerate/mock them on-the-fly to prevent quiz crashes
    if (!questions) {
      let lesson: { title: string; description: string | null } | null = null;
      if (data.lesson_id === "custom") {
        lesson = { title: "Custom Video Lesson", description: "Custom video loaded from user-provided link." };
      } else {
        try {
          const { data: dbLesson } = await supabase
            .from("lessons").select("title, description").eq("id", data.lesson_id).single();
          lesson = dbLesson;
        } catch (dbErr) {
          console.warn("Could not load lesson from DB on submit:", dbErr);
        }

        if (!lesson) {
          const mockL = MOCK_LESSONS.find(m => m.id === data.lesson_id);
          if (mockL) {
            lesson = { title: mockL.title, description: mockL.description };
          } else {
            lesson = { title: "Selected Lesson Topic", description: "Learn key concepts and test your understanding." };
          }
        }
      }

      const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || data.custom_api_key;
      if (!key) {
        questions = getMockQuestions(lesson.title, lesson.description ?? "");
      } else {
        try {
          const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
          const { generateText, Output } = await import("ai");
          const google = createGoogleGenerativeAI({ apiKey: key });

          const { output } = await generateText({
            model: google("gemini-2.5-flash"),
            output: Output.object({ schema: QuizSchema }),
            prompt: `Create a 5-question quiz for the lesson "${lesson.title}". Description: ${lesson.description ?? ""}.
Mix 4 multiple-choice (4 options each, set correct_index 0-3) and 1 short-answer (provide expected_keywords).
Vary difficulty. Keep questions tight and unambiguous.`,
          });
          questions = output.questions;
        } catch (err) {
          console.error("Failed to generate AI quiz on submit, falling back to mock:", err);
          questions = getMockQuestions(lesson.title, lesson.description ?? "");
        }
      }
    }

    let correct = 0;
    type Row = { correct: boolean; expected: string; given: string };
    const breakdown: Row[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]; const a = data.answers[i];
      if (q.type === "mcq") {
        const ok = typeof a === "number" && a === q.correct_index;
        if (ok) correct++;
        breakdown.push({ correct: ok, expected: String(q.correct_index ?? ""), given: String(a ?? "") });
      } else {
        const text = String(a ?? "").toLowerCase();
        const kws = (q.expected_keywords ?? []).map((k) => k.toLowerCase());
        const hits = kws.filter((k) => text.includes(k)).length;
        const ok = kws.length === 0 ? text.length > 20 : hits >= Math.max(1, Math.ceil(kws.length / 2));
        if (ok) correct++;
        breakdown.push({ correct: ok, expected: (q.expected_keywords ?? []).join(", "), given: String(a ?? "") });
      }
    }

    const total = questions.length;
    const score = Math.round((correct / total) * 100);

    let confusion: "low" | "medium" | "high" = "low";
    try {
      const { data: prior } = await supabase
        .from("quiz_attempts").select("score").eq("lesson_id", data.lesson_id)
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(3);
      const avgPrior = prior && prior.length ? prior.reduce((s, x) => s + Number(x.score), 0) / prior.length : 100;
      confusion =
        score < 50 || (prior && prior.length >= 2 && avgPrior < 60) ? "high"
        : score < 75 ? "medium" : "low";
    } catch (dbErr) {
      console.warn("Failed to query prior attempts, default confusion to score threshold:", dbErr);
      confusion = score < 50 ? "high" : score < 75 ? "medium" : "low";
    }

    try {
      await supabase.from("quiz_attempts").insert({
        user_id: userId, lesson_id: data.lesson_id,
        score, total, correct, answers: breakdown, confusion_level: confusion,
      });

      if (confusion !== "low") {
        await supabase.from("learning_events").insert({
          user_id: userId, lesson_id: data.lesson_id,
          event_type: confusion === "high" ? "HighConfusion" : "MediumConfusion",
          payload: { score, correct, total },
        });
      }
    } catch (insertErr) {
      console.warn("Failed to save quiz attempt / confusion event to database:", insertErr);
    }

    const next_action: "repeat_lesson" | "extra_practice" | "unlock_next" =
      score < 60 ? "repeat_lesson" : score < 80 ? "extra_practice" : "unlock_next";

    return { score, correct, total, confusion, next_action, breakdown };
  });

const EventInput = z.object({
  lesson_id: z.string().uuid().nullable().optional(),
  event_type: z.string().max(50),
  payload: z.record(z.string(), z.any()).optional(),
});

export const logEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => EventInput.parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("learning_events").insert({
      user_id: context.userId,
      lesson_id: data.lesson_id ?? null,
      event_type: data.event_type,
      payload: data.payload ?? {},
    });
    return { ok: true };
  });

const AttentionInput = z.object({
  lesson_id: z.string().uuid().nullable().optional(),
  score: z.number().int().min(0).max(100),
  factors: z.record(z.string(), z.any()).optional(),
});

export const logAttention = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => AttentionInput.parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("attention_logs").insert({
      user_id: context.userId,
      lesson_id: data.lesson_id ?? null,
      score: data.score,
      factors: data.factors ?? {},
    });
    return { ok: true };
  });

const ProgressInput = z.object({
  lesson_id: z.string().uuid(),
  last_position: z.number().int().min(0),
  watched_seconds: z.number().int().min(0),
  attention_avg: z.number().int().min(0).max(100).optional(),
  completed: z.boolean().optional(),
});

export const upsertProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ProgressInput.parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("lesson_progress")
      .upsert({
        user_id: context.userId,
        lesson_id: data.lesson_id,
        last_position: data.last_position,
        watched_seconds: data.watched_seconds,
        attention_avg: typeof data.attention_avg === "number" ? data.attention_avg : null,
        completed_at: data.completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,lesson_id" });
    return { ok: true };
  });
