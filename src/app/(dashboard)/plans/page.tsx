"use client";

import Link from "next/link";
import { useState } from "react";

const plans = [
  {
    id: "1",
    name: "12-Week Strength Builder",
    description: "Progressive overload program designed to build raw strength with compound movements.",
    duration: 12,
    difficulty: "intermediate" as const,
    goal: "Build Strength",
    participants: 3400,
    rating: 4.8,
    weeks: 12,
    workoutsPerWeek: 4,
  },
  {
    id: "2",
    name: "Couch to 5K",
    description: "Zero to running a 5K in 8 weeks. Perfect for complete beginners.",
    duration: 8,
    difficulty: "beginner" as const,
    goal: "Run a 5K",
    participants: 8900,
    rating: 4.9,
    weeks: 8,
    workoutsPerWeek: 3,
  },
  {
    id: "3",
    name: "Shred Program",
    description: "Intense 6-week cutting program combining HIIT and strength training.",
    duration: 6,
    difficulty: "advanced" as const,
    goal: "Lose Fat",
    participants: 5600,
    rating: 4.7,
    weeks: 6,
    workoutsPerWeek: 5,
  },
  {
    id: "4",
    name: "Yoga Foundations",
    description: "Build flexibility, balance, and mindfulness with daily yoga practice.",
    duration: 4,
    difficulty: "beginner" as const,
    goal: "Flexibility",
    participants: 6200,
    rating: 4.9,
    weeks: 4,
    workoutsPerWeek: 5,
  },
];

const difficultyColors = {
  beginner: "bg-fitness-500/10 text-fitness-500",
  intermediate: "bg-yellow-500/10 text-yellow-500",
  advanced: "bg-red-500/10 text-red-500",
};

export default function PlansPage() {
  const [filter, setFilter] = useState("All");
  const filtered = plans.filter((p) => filter === "All" || p.difficulty === filter.toLowerCase());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Training Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">Structured programs to reach your goals</p>
        </div>
      </div>

      <div className="flex gap-2">
        {["All", "Beginner", "Intermediate", "Advanced"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-fitness-600 text-white"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((plan) => (
          <Link
            key={plan.id}
            href={`/plans/${plan.id}`}
            className="group rounded-2xl border border-border/50 bg-card p-6 hover:border-fitness-500/30 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold group-hover:text-fitness-500 transition-colors">
                  {plan.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>
              <span className={`rounded-lg px-2 py-1 text-xs font-medium ${difficultyColors[plan.difficulty]}`}>
                {plan.difficulty}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <div className="text-lg font-bold">{plan.duration}</div>
                <div className="text-xs text-muted-foreground">Weeks</div>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <div className="text-lg font-bold">{plan.workoutsPerWeek}x</div>
                <div className="text-xs text-muted-foreground">Per Week</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {plan.rating}
              </div>
              <span className="text-muted-foreground">
                {plan.participants.toLocaleString()} participants
              </span>
              <span className="rounded-lg bg-muted px-2 py-1 text-xs font-medium">
                {plan.goal}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
