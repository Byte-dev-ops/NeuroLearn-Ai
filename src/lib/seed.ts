import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load .env variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your .env file to run the seed script.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const COURSES = [
  {
    title: "Neuroscience-Inspired AI Fundamentals",
    description: "Learn how brain-inspired architectures and event-driven computing shape the next generation of adaptive artificial intelligence.",
    cover_emoji: "🧠",
    lessons: [
      {
        title: "Introduction to Neuromorphic Computing",
        description: "Explore the core concepts of spike-based computing, event-driven processing, and hardware designed to mimic human brain functions.",
        youtube_id: "Fqp7OskS08Y", // High quality intro video
        position: 1,
        duration_seconds: 600,
      },
      {
        title: "Event-Driven vs Frame-Based Processing",
        description: "Compare traditional continuous video frame processing with neuromorphic silicon vision sensors that trigger calculations only on changes.",
        youtube_id: "Lg27vG1X6wQ",
        position: 2,
        duration_seconds: 720,
      },
    ],
  },
  {
    title: "Adaptive Interface Design",
    description: "Master the techniques of building interfaces that detect attention, analyze confusion, and adapt content dynamically.",
    cover_emoji: "👁️",
    lessons: [
      {
        title: "Attention Tracking Heuristics",
        description: "A deep dive into combining webcam brightness, motion levels, and document visibility into a unified attention metric.",
        youtube_id: "2Mqp6yZ5cLI",
        position: 1,
        duration_seconds: 540,
      },
      {
        title: "Designing Real-Time AI Tutor Feedback",
        description: "Learn how to orchestrate user state events to trigger micro-explanations, analogy popups, and dynamic assessments.",
        youtube_id: "f_yE8gpxp1Y",
        position: 2,
        duration_seconds: 680,
      },
    ],
  },
];

async function seed() {
  console.log("Checking database for existing courses...");
  
  const { data: existingCourses, error: courseCheckError } = await supabase
    .from("courses")
    .select("id")
    .limit(1);

  if (courseCheckError) {
    console.error("Error reading from courses table:", courseCheckError.message);
    console.log("Please make sure your migrations have run and the database schema is initialized.");
    process.exit(1);
  }

  if (existingCourses && existingCourses.length > 0) {
    console.log("Database already contains course data. Skipping seeding to prevent duplicate data.");
    return;
  }

  console.log("No courses found. Starting seeding...");

  for (const courseData of COURSES) {
    const { lessons, ...course } = courseData;
    
    console.log(`Inserting course: ${course.title}...`);
    const { data: insertedCourse, error: courseInsertError } = await supabase
      .from("courses")
      .insert(course)
      .select("id")
      .single();

    if (courseInsertError || !insertedCourse) {
      console.error(`Error inserting course "${course.title}":`, courseInsertError?.message);
      continue;
    }

    console.log(`Successfully created course "${course.title}". Inserting ${lessons.length} lessons...`);

    const lessonsToInsert = lessons.map(lesson => ({
      ...lesson,
      course_id: insertedCourse.id,
    }));

    const { error: lessonsInsertError } = await supabase
      .from("lessons")
      .insert(lessonsToInsert);

    if (lessonsInsertError) {
      console.error(`Error inserting lessons for course "${course.title}":`, lessonsInsertError.message);
    } else {
      console.log(`Successfully seeded lessons for course "${course.title}".`);
    }
  }

  console.log("Seeding process completed!");
}

seed().catch(err => {
  console.error("Fatal error during seeding:", err);
  process.exit(1);
});
