"use client";

import { useState } from "react";

const goals = [
  { id: "1", title: "Reach 170 lbs", description: "Lose 8 more pounds to reach target weight", type: "weight" as const, target: 170, current: 178, unit: "lbs", deadline: "2024-06-01", createdAt: "2024-01-15" },
  { id: "2", title: "Bench Press 225 lbs", description: "Increase bench press 1RM by 30 lbs", type: "workout" as const, target: 225, current: 195, unit: "lbs", deadline: "2024-08-01", createdAt: "2024-02-01" },
  { id: "3", title: "Workout 5x/week", description: "Maintain consistent training schedule", type: "workout" as const, target: 5, current: 4, unit: "days/week", deadline: undefined, createdAt: "2024-01-01" },
  { id: "4", title: "Eat 160g protein daily", description: "Hit protein goal consistently", type: "nutrition" as const, target: 160, current: 145, unit: "g/day", deadline: undefined, createdAt: "2024-02-15" },
  { id: "5", title: "Run a 5K under 25 min", description: "Improve 5K time by 3 minutes", type: "custom" as const, target: 25, current: 28, unit: "min", deadline: "2024-09-01", createdAt: "2024-03-01" },
];

const achievements = [
  { title: "First Workout", description: "Completed your first workout", icon: "🏋️", unlocked: true },
  { title: "7-Day Streak", description: "Worked out 7 days in a row", icon: "🔥", unlocked: true },
  { title: "100 Workouts", description: "Logged 100 total workouts", icon: "💪", unlocked: true },
  { title: "Protein Pro", description: "Hit protein goal 30 days straight", icon: "🥩", unlocked: false },
  { title: "Marathon Ready", description: "Run 26.2 miles total", icon: "🏃", unlocked: false },
  { title: "Iron Will", description: "Bench press your bodyweight", icon: "⚡", unlocked: false },
  { title: "Social Butterfly", description: "Get 50 likes on posts", icon: "🦋", unlocked: false },
  { title: "Century Club", description: "Lift 100,000 lbs total", icon: "🏆", unlocked: false },
];

export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState<"goals" | "achievements">("goals");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals & Achievements</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your milestones</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-fitness-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-fitness-700 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Goal
        </button>
      </div>

      <div className="flex gap-2 border-b border-border/40 pb-px">
        {(["goals", "achievements"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "text-fitness-500 border-b-2 border-fitness-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab} ({tab === "goals" ? goals.length : achievements.filter((a) => a.unlocked).length})
          </button>
        ))}
      </div>

      {activeTab === "goals" && (
        <div className="space-y-4">
          {goals.map((goal) => {
            const pct = Math.min((goal.current / goal.target) * 100, 100);
            const isComplete = goal.current >= goal.target;
            return (
              <div
                key={goal.id}
                className={`rounded-2xl border bg-card p-5 ${
                  isComplete ? "border-fitness-500/30" : "border-border/50"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      {goal.title}
                      {isComplete && (
                        <span className="rounded-full bg-fitness-500/10 px-2 py-0.5 text-[10px] font-medium text-fitness-500">
                          Complete
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
                  </div>
                  <span className="rounded-lg bg-muted px-2 py-1 text-xs font-medium capitalize">
                    {goal.type}
                  </span>
                </div>
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex-1">
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isComplete ? "bg-fitness-500" : "bg-energy-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium shrink-0">
                    {goal.current} / {goal.target} {goal.unit}
                  </span>
                </div>
                {goal.deadline && (
                  <div className="text-xs text-muted-foreground">
                    Deadline: {new Date(goal.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "achievements" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {achievements.map((a, i) => (
            <div
              key={i}
              className={`rounded-2xl border bg-card p-5 ${
                a.unlocked ? "border-fitness-500/30" : "border-border/50 opacity-60"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`text-3xl ${a.unlocked ? "" : "grayscale"}`}>{a.icon}</div>
                <div>
                  <h3 className="text-sm font-semibold">{a.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                  {a.unlocked ? (
                    <span className="text-xs text-fitness-500 font-medium mt-1 inline-block">Unlocked</span>
                  ) : (
                    <span className="text-xs text-muted-foreground mt-1 inline-block">Locked</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
