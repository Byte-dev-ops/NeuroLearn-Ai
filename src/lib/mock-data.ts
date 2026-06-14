export type Lesson = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  youtube_id: string;
  position: number;
  duration_seconds: number | null;
};

export type Course = {
  id: string;
  title: string;
  description: string | null;
  cover_emoji: string | null;
  lessons: Lesson[];
};

export const MOCK_COURSES: Course[] = [
  {
    id: "c1111111-1111-1111-1111-111111111111",
    title: "Neuroscience-Inspired AI Fundamentals",
    description: "Learn how brain-inspired architectures and event-driven computing shape the next generation of adaptive artificial intelligence.",
    cover_emoji: "🧠",
    lessons: [
      {
        id: "l1111111-1111-1111-1111-111111111111",
        course_id: "c1111111-1111-1111-1111-111111111111",
        title: "Introduction to Neuromorphic Computing",
        description: "Explore the core concepts of spike-based computing, event-driven processing, and hardware designed to mimic human brain functions.",
        youtube_id: "Fqp7OskS08Y",
        position: 1,
        duration_seconds: 600,
      },
      {
        id: "l2222222-2222-2222-2222-222222222222",
        course_id: "c1111111-1111-1111-1111-111111111111",
        title: "Event-Driven vs Frame-Based Processing",
        description: "Compare traditional continuous video frame processing with neuromorphic silicon vision sensors that trigger calculations only on changes.",
        youtube_id: "Lg27vG1X6wQ",
        position: 2,
        duration_seconds: 720,
      },
    ],
  },
  {
    id: "c2222222-2222-2222-2222-222222222222",
    title: "Adaptive Interface Design",
    description: "Master the techniques of building interfaces that detect attention, analyze confusion, and adapt content dynamically.",
    cover_emoji: "👁️",
    lessons: [
      {
        id: "l3333333-3333-3333-3333-333333333333",
        course_id: "c2222222-2222-2222-2222-222222222222",
        title: "Attention Tracking Heuristics",
        description: "A deep dive into combining webcam brightness, motion levels, and document visibility into a unified attention metric.",
        youtube_id: "2Mqp6yZ5cLI",
        position: 1,
        duration_seconds: 540,
      },
      {
        id: "l4444444-4444-4444-4444-444444444444",
        course_id: "c2222222-2222-2222-2222-222222222222",
        title: "Designing Real-Time AI Tutor Feedback",
        description: "Learn how to orchestrate user state events to trigger micro-explanations, analogy popups, and dynamic assessments.",
        youtube_id: "f_yE8gpxp1Y",
        position: 2,
        duration_seconds: 680,
      },
    ],
  },
];

export const MOCK_LESSONS: Lesson[] = MOCK_COURSES.reduce<Lesson[]>((acc, course) => {
  return [...acc, ...course.lessons];
}, []);
