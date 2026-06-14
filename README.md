# 🧠 NeuroLearn AI — Emotion-Aware Adaptive Learning Platform

> **Hackathon MVP**: A brain-inspired, event-driven learning platform that adapts content to student attention, comprehension, and confusion in real time.

NeuroLearn AI simulates a personalized tutor sitting right next to the student. By fusing lightweight local proctoring sensors (attention, vocal activity, and face counts) with dynamic LLM-based quiz generation and grading, the platform creates an interactive, adaptive education feedback loop.

---

## 🚀 Key Features

*   **👁️ Real-Time Attention Monitoring**: Tracks webcam frames, browser focus, and student activity to calculate an attention score (0-100). If attention drops significantly, the lesson video automatically pauses.
*   **🎙️ Vocal Proctoring**: Detects speech in the background during quiet study sessions, triggering adaptive alerts and event logs.
*   **🧩 Resilient AI Quiz Engine**: Uses the Google Gemini API (via Vercel server-side keys or secure client-side browser injection) to generate custom multiple-choice and short-answer quizzes.
*   **⚡ Neuromorphic Event Fusing**: All sensor data is processed event-driven (only recording on state changes like "Face Lost", "Speaking Detected", or "Quiz Failed"), keeping database writes lightweight and scalable.
*   **🎛️ Floating Demo Sandbox**: A custom panel designed for hackathon judges. It lets you simulate attention drops, speaking events, and face counts in one click without giving camera permissions.
*   **🤖 Adaptive AI Tutor Chat**: A conversational tutor assistant that understands the current lesson context and tailors explanations (using analogies or simpler wording) based on the student's recent performance.

---

## 🛠️ Technology Stack

*   **Framework**: [TanStack Start v1](https://tanstack.com/start) (Vite-native architecture)
*   **Frontend**: React 19, Tailwind CSS, Lucide React, Shadcn UI Components
*   **Database & Auth**: [Supabase](https://supabase.com) (PostgreSQL, Row Level Security)
*   **AI Engine**: [Google Gemini 2.5 Flash](https://aistudio.google.com/) via the Vercel AI SDK
*   **State & Routing**: TanStack Router + React Query

---

## 🏁 Getting Started

### 1. Prerequisites
Ensure you have **Node.js 20.x** installed (matching the production Vercel environment).

### 2. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/Byte-dev-ops/NeuroLearn-Ai.git
cd NeuroLearn-Ai
npm install --legacy-peer-deps
```

### 3. Environment Setup
Create a `.env` file in the root directory and add your Supabase credentials:
```env
SUPABASE_URL="https://your-supabase-project.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"
VITE_SUPABASE_URL="https://your-supabase-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"

# (Optional) Add your server-side Gemini key here, or configure it via the Demo Sandbox in the browser
GEMINI_API_KEY="your-gemini-api-key"
```

### 4. Running the Dev Server
Start the Vite development server locally:
```bash
npm run dev
```
Open **[http://127.0.0.1:3000](http://127.0.0.1:3000)** in your browser.

---

## 🎛️ Hackathon Demo Guide (For Judges)

We have made the application fully testable **out-of-the-box** without requiring any pre-configured environment variables or server keys.

1.  **Open the Sandbox**: Click the glowing **Sliders icon** floating in the bottom-right corner of the application.
2.  **Add a Gemini API Key**: Paste a free Gemini API key from [Google AI Studio](https://aistudio.google.com/) and click **Save**. This saves the key to your browser's `localStorage` and securely routes all quiz generations/chats through it. If left blank, the app gracefully degrades to mock questions.
3.  **Simulate Webcam Proctoring**:
    *   Click **0 Faces**: The webcam monitor card will display a red "Detected Anomaly" alert, drop your attention level, and pause the video player.
    *   Click **2+ Faces**: Triggers a multi-person warning event and pauses the video.
    *   Toggle **Speaking: ON**: Immediately flags speaking activity and logs it to the neuromorphic event stream.
4.  **Grading & Feedback**: Submit answers on any quiz to view your score, breakdown, and personalized tutor suggestions.

---

## 💾 Database Configuration & Migrations

If you want to spin up your own Supabase instance, all PostgreSQL schemas, tables (profiles, courses, lessons, quizzes, quiz attempts, and event logs), and triggers are located in:
📂 [supabase/migrations/](file:///e:/crome/neurolearn-ai/neurolearn-ai-main/supabase/migrations)

Apply them to your Supabase project using the Supabase CLI:
```bash
supabase db push
```

---

## ☁️ Deployment

This project is optimized for deployment on **Vercel** with a zero-configuration setup for TanStack Start / Nitro.

### Vercel Project Settings
*   **Build Command**: `vite build` (runs the Vite-native compiler)
*   **Output Directory**: `.output` (configured in `vercel.json` to map the Nitro bundle correctly)
*   **Node.js Version**: Set to **20.x** to ensure compatibility with rollup compilation.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
