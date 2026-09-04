"use client";

import Link from "next/link";
import { useState } from "react";

const categories = ["All", "Strength", "Cardio", "HIIT", "Yoga", "Stretching", "Bodyweight"];

const workouts = [
  {
    id: "1",
    name: "Full Body Strength",
    category: "Strength",
    difficulty: "intermediate" as const,
    duration: 45,
    calories: 400,
    exercises: 8,
    rating: 4.8,
    completions: 12400,
    tags: ["Full Body", "Barbell"],
    createdBy: "ai" as const,
    image: "bg-gradient-to-br from-fitness-500 to-fitness-700",
  },
  {
    id: "2",
    name: "HIIT Cardio Blast",
    category: "HIIT",
    difficulty: "advanced" as const,
    duration: 30,
    calories: 350,
    exercises: 6,
    rating: 4.7,
    completions: 8900,
    tags: ["Cardio", "No Equipment"],
    createdBy: "ai" as const,
    image: "bg-gradient-to-br from-orange-500 to-red-500",
  },
  {
    id: "3",
    name: "Morning Yoga Flow",
    category: "Yoga",
    difficulty: "beginner" as const,
    duration: 20,
    calories: 120,
    exercises: 10,
    rating: 4.9,
    completions: 15600,
    tags: ["Flexibility", "Mindfulness"],
    createdBy: "community" as const,
    image: "bg-gradient-to-br from-purple-500 to-indigo-500",
  },
  {
    id: "4",
    name: "Upper Body Power",
    category: "Strength",
    difficulty: "intermediate" as const,
    duration: 40,
    calories: 320,
    exercises: 7,
    rating: 4.6,
    completions: 6700,
    tags: ["Chest", "Arms", "Shoulders"],
    createdBy: "ai" as const,
    image: "bg-gradient-to-br from-energy-500 to-energy-700",
  },
  {
    id: "5",
    name: "Leg Day Destroyer",
    category: "Strength",
    difficulty: "advanced" as const,
    duration: 50,
    calories: 450,
    exercises: 6,
    rating: 4.5,
    completions: 4500,
    tags: ["Legs", "Glutes"],
    createdBy: "community" as const,
    image: "bg-gradient-to-br from-fitness-600 to-energy-600",
  },
  {
    id: "6",
    name: "Core Crusher",
    category: "Bodyweight",
    difficulty: "intermediate" as const,
    duration: 25,
    calories: 200,
    exercises: 8,
    rating: 4.7,
    completions: 9200,
    tags: ["Abs", "Core", "No Equipment"],
    createdBy: "ai" as const,
    image: "bg-gradient-to-br from-pink-500 to-rose-500",
  },
];

const difficultyColors = {
  beginner: "bg-fitness-500/10 text-fitness-500",
  intermediate: "bg-yellow-500/10 text-yellow-500",
  advanced: "bg-red-500/10 text-red-500",
};

export default function WorkoutsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = workouts.filter((w) => {
    const matchCategory = activeCategory === "All" || w.category === activeCategory;
    const matchSearch = w.name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workout Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} workouts available
          </p>
        </div>
        <Link
          href="/workouts/start/custom"
          className="flex items-center gap-2 rounded-xl bg-fitness-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-fitness-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Workout
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search workouts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-muted/50 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fitness-500/50 focus:border-fitness-500 transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-fitness-600 text-white"
                  : "border border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((workout) => (
          <Link
            key={workout.id}
            href={`/workouts/${workout.id}`}
            className="group rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-fitness-500/30 hover:shadow-lg transition-all duration-300"
          >
            <div className={`h-32 ${workout.image} relative`}>
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute top-3 right-3 flex gap-2">
                <span className={`rounded-lg px-2 py-1 text-xs font-medium ${difficultyColors[workout.difficulty]}`}>
                  {workout.difficulty}
                </span>
                {workout.createdBy === "ai" && (
                  <span className="rounded-lg bg-purple-500/20 px-2 py-1 text-xs font-medium text-purple-400">
                    AI
                  </span>
                )}
              </div>
              <div className="absolute bottom-3 left-3 text-white">
                <div className="text-lg font-bold">{workout.name}</div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {workout.duration} min
                </span>
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  </svg>
                  {workout.calories} cal
                </span>
                <span>{workout.exercises} exercises</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm font-medium">{workout.rating}</span>
                  <span className="text-xs text-muted-foreground">({(workout.completions / 1000).toFixed(1)}K)</span>
                </div>
                <div className="flex gap-1">
                  {workout.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
