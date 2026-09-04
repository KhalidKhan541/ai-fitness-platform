"use client";

import { useState } from "react";

const muscleGroups = ["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];
const equipmentOptions = ["All", "Barbell", "Dumbbell", "Machine", "Cable", "Bodyweight", "Kettlebell"];

const exercises = [
  { id: "1", name: "Barbell Bench Press", muscle: "Chest", equipment: "Barbell", difficulty: "intermediate" as const, instructions: ["Lie on bench", "Grip bar slightly wider than shoulders", "Lower to chest", "Press up"] },
  { id: "2", name: "Squat", muscle: "Legs", equipment: "Barbell", difficulty: "intermediate" as const, instructions: ["Place bar on upper back", "Feet shoulder width", "Descend to parallel", "Drive up"] },
  { id: "3", name: "Deadlift", muscle: "Back", equipment: "Barbell", difficulty: "advanced" as const, instructions: ["Stand over bar", "Grip bar at shoulder width", "Drive through heels", "Lock out hips"] },
  { id: "4", name: "Overhead Press", muscle: "Shoulders", equipment: "Barbell", difficulty: "intermediate" as const, instructions: ["Grip bar at shoulder width", "Press overhead", "Lock out arms", "Lower with control"] },
  { id: "5", name: "Pull Up", muscle: "Back", equipment: "Bodyweight", difficulty: "intermediate" as const, instructions: ["Grip bar palms away", "Pull chin over bar", "Lower with control", "Full range of motion"] },
  { id: "6", name: "Dumbbell Curl", muscle: "Arms", equipment: "Dumbbell", difficulty: "beginner" as const, instructions: ["Hold dumbbells at sides", "Curl up", "Squeeze biceps", "Lower slowly"] },
  { id: "7", name: "Plank", muscle: "Core", equipment: "Bodyweight", difficulty: "beginner" as const, instructions: ["Forearms on ground", "Body straight", "Hold position", "Breathe steadily"] },
  { id: "8", name: "Lateral Raise", muscle: "Shoulders", equipment: "Dumbbell", difficulty: "beginner" as const, instructions: ["Hold dumbbells at sides", "Raise arms to sides", "Parallel to floor", "Lower slowly"] },
  { id: "9", name: "Leg Press", muscle: "Legs", equipment: "Machine", difficulty: "beginner" as const, instructions: ["Sit in machine", "Place feet shoulder width", "Lower weight", "Press up"] },
  { id: "10", name: "Cable Fly", muscle: "Chest", equipment: "Cable", difficulty: "intermediate" as const, instructions: ["Set cables at shoulder height", "Step forward", "Bring hands together", "Squeeze chest"] },
];

const difficultyColors = {
  beginner: "bg-fitness-500/10 text-fitness-500",
  intermediate: "bg-yellow-500/10 text-yellow-500",
  advanced: "bg-red-500/10 text-red-500",
};

const muscleColors: Record<string, string> = {
  Chest: "bg-muscle-chest",
  Back: "bg-muscle-back",
  Legs: "bg-muscle-legs",
  Shoulders: "bg-muscle-shoulders",
  Arms: "bg-muscle-arms",
  Core: "bg-muscle-core",
};

export default function ExercisesPage() {
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("All");
  const [equip, setEquip] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = exercises.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = muscle === "All" || e.muscle === muscle;
    const matchEquip = equip === "All" || e.equipment === equip;
    return matchSearch && matchMuscle && matchEquip;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Exercise Database</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {filtered.length} exercises
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-muted/50 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fitness-500/50 focus:border-fitness-500 transition-colors"
          />
        </div>
        <select
          value={muscle}
          onChange={(e) => setMuscle(e.target.value)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-fitness-500/50"
        >
          {muscleGroups.map((m) => (
            <option key={m} value={m}>{m === "All" ? "All Muscles" : m}</option>
          ))}
        </select>
        <select
          value={equip}
          onChange={(e) => setEquip(e.target.value)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-fitness-500/50"
        >
          {equipmentOptions.map((eq) => (
            <option key={eq} value={eq}>{eq === "All" ? "All Equipment" : eq}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((ex) => (
          <div
            key={ex.id}
            className="rounded-2xl border border-border/50 bg-card overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(expandedId === ex.id ? null : ex.id)}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
            >
              <div className={`h-10 w-10 rounded-xl ${muscleColors[ex.muscle] || "bg-muted"} flex items-center justify-center`}>
                <span className="text-white text-xs font-bold">{ex.muscle[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{ex.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{ex.muscle}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{ex.equipment}</span>
                </div>
              </div>
              <span className={`rounded-lg px-2 py-1 text-xs font-medium ${difficultyColors[ex.difficulty]}`}>
                {ex.difficulty}
              </span>
              <svg
                className={`h-4 w-4 text-muted-foreground transition-transform ${expandedId === ex.id ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedId === ex.id && (
              <div className="border-t border-border/30 px-4 pb-4 pt-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Instructions</h4>
                <ol className="space-y-1.5">
                  {ex.instructions.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
