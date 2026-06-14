import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

type Body = { messages?: UIMessage[]; lessonTitle?: string; confusion?: string; custom_api_key?: string };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        if (!Array.isArray(body.messages)) {
          return new Response("messages required", { status: 400 });
        }
        const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || body.custom_api_key;
        if (!key) {
          // Return a mock streamed response if key is missing
          const mockResponseText = `Hello! I'm your AI Tutor. It looks like the \`GEMINI_API_KEY\` is not set in the \`.env\` file yet. Please add it to enable real-time dynamic instruction.

Currently, your estimated confusion level is **${body.confusion ?? "low"}** for the lesson **"${body.lessonTitle ?? "Unknown"}"**.

How can I help you study this material? (Setup your Gemini API key to get smart, context-aware answers!)`;

          // A simple readable stream that yields chunks of the mock response
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              // Yield the message in parts to simulate streaming
              const chunks = mockResponseText.split(/(\s+)/);
              for (const chunk of chunks) {
                // Send the plain text chunk formatted for AI SDK client compatibility
                // In v3+ of AI SDK, text chunks are prepended with '0:'
                controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`));
                await new Promise((r) => setTimeout(r, 15));
              }
              controller.close();
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "x-vercel-ai-data-stream": "v1"
            },
          });
        }

        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
        const google = createGoogleGenerativeAI({ apiKey: key });
        const system = `You are NeuroLearn AI Tutor, a warm, concise teacher.
Current lesson: "${body.lessonTitle ?? "(unknown)"}". Learner confusion: ${body.confusion ?? "low"}.
When confusion is medium/high, prefer:
- a simplified plain-English explanation
- a real-world analogy
- one worked example
- a tiny practice question
Use markdown. Keep responses under ~180 words unless asked for depth.`;

        const result = streamText({
          model: google("gemini-2.5-flash"),
          system,
          messages: await convertToModelMessages(body.messages),
        });
        return result.toUIMessageStreamResponse({ originalMessages: body.messages });
      },
    },
  },
});
