"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

const planData: Record<string, {
  name: string;
  description: string;
  duration: number;
  difficulty: string;
  goal: string;
  rating: number;
  participants: number;
  weeks: { week: number; days: { day: string; workout: string; type: string; duration: string; isRest: boolean }[] }[];
}> = {
  "1": {
    name: "12-Week Strength Builder",
    description: "Progressive overload program designed to build raw strength with compound movements. Includes deload weeks and testing phases.",
    duration: 12,
    difficulty: "Intermediate",
    goal: "Build Strength",
    rating: 4.8,
    participants: 3400,
    weeks: [
      {
        week: 1,
        days: [
          { day: "Monday", workout: "Upper Body A", type: "Strength", duration: "50 min", isRest: false },
          { day: "Tuesday", workout: "Lower Body A", type: "Strength", duration: "50 min", isRest: false },
          { day: "Wednesday", workout: "Rest", type: "", duration: "", isRest: true },
          { day: "Thursday", workout: "Upper Body B", type: "Strength", duration: "50 min", isRest: false },
          { day: "Friday", workout: "Lower Body B", type: "Strength", duration: "50 min", isRest: false },
          { day: "Saturday", workout: "Active Recovery", type: "Cardio", duration: "30 min", isRest: false },
          { day: "Sunday", workout: "Rest", type: "", duration: "", isRest: true },
        ],
      },
      {
        week: 2,
        days: [
          { day: "Monday", workout: "Push", type: "Strength", duration: "55 min", isRest: false },
          { day: "Tuesday", workout: "Pull", type: "Strength", duration: "55 min", isRest: false },
          { day: "Wednesday", workout: "Legs", type: "Strength", duration: "55 min", isRest: false },
          { day: "Thursday", workout: "Rest", type: "", duration: "", isRest: true },
          { day: "Friday", workout: "Upper Power", type: "Strength", duration: "50 min", isRest: false },
          { day: "Saturday", workout: "Lower Power", type: "Strength", duration: "50 min", isRest: false },
          { day: "Sunday", workout: "Rest", type: "", duration: "", isRest: true },
        ],
      },
    ],
  },
};

const defaultPlan = {
  name: "Training Plan",
  description: "A structured program to help you reach your fitness goals.",
  duration: 8,
  difficulty: "Intermediate",
  goal: "General Fitness",
  rating: 4.7,
  participants: 1200,
  weeks: [
    {
      week: 1,
      days: [
        { day: "Monday", workout: "Full Body", type: "Strength", duration: "45 min", isRest: false },
        { day: "Tuesday", workout: "Cardio", type: "Cardio", duration: "30 min", isRest: false },
        { day: "Wednesday", workout: "Rest", type: "", duration: "", isRest: true },
        { day: "Thursday", workout: "Upper Body", type: "Strength", duration: "45 min", isRest: false },
        { day: "Friday", workout: "Lower Body", type: "Strength", duration: "45 min", isRest: false },
        { day: "Saturday", workout: "Active Recovery", type: "Yoga", duration: "30 min", isRest: false },
        { day: "Sunday", workout: "Rest", type: "", duration: "", isRest: true },
      ],
    },
  ],
};

export default function PlanDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const plan = planData[id] || defaultPlan;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/plans" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Plans
      </Link>

      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{plan.name}</h1>
            <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
          </div>
          <span className="rounded-lg bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-500">
            {plan.difficulty}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="rounded-xl bg-muted/50 p-4 text-center">
            <div className="text-xl font-bold">{plan.duration}</div>
            <div className="text-xs text-muted-foreground">Weeks</div>
          </div>
          <div className="rounded-xl bg-muted/50 p-4 text-center">
            <div className="text-xl font-bold">{plan.goal}</div>
            <div className="text-xs text-muted-foreground">Goal</div>
          </div>
          <div className="rounded-xl bg-muted/50 p-4 text-center">
            <div className="text-xl font-bold">{plan.rating}</div>
            <div className="text-xs text-muted-foreground">Rating</div>
          </div>
          <div className="rounded-xl bg-muted/50 p-4 text-center">
            <div className="text-xl font-bold">{plan.participants.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Joined</div>
          </div>
        </div>
        <button className="mt-6 w-full rounded-xl bg-fitness-600 py-3 text-sm font-medium text-white hover:bg-fitness-700 transition-colors">
          Start This Plan
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Weekly Schedule</h2>
        {plan.weeks.map((week) => (
          <div key={week.week} className="rounded-2xl border border-border/50 bg-card p-6">
            <h3 className="text-sm font-semibold mb-4">Week {week.week}</h3>
            <div className="space-y-2">
              {week.days.map((day) => (
                <div
                  key={day.day}
                  className={`flex items-center gap-4 rounded-xl p-3 ${
                    day.isRest ? "bg-muted/30" : "bg-muted/10 hover:bg-muted/30"
                  } transition-colors`}
                >
                  <div className="w-24 text-sm font-medium">{day.day}</div>
                  {day.isRest ? (
                    <div className="text-sm text-muted-foreground italic">Rest Day</div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{day.workout}</div>
                      </div>
                      <span className="rounded-lg bg-muted px-2 py-1 text-xs font-medium">{day.type}</span>
                      <span className="text-xs text-muted-foreground">{day.duration}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
