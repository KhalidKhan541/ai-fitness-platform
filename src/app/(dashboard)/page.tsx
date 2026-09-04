"use client";

import Link from "next/link";
import { useState } from "react";

const todayStats = [
  { label: "Calories Burned", value: "487", icon: "fire", color: "text-orange-500", bg: "bg-orange-500/10" },
  { label: "Active Minutes", value: "42", icon: "clock", color: "text-energy-500", bg: "bg-energy-500/10" },
  { label: "Workouts", value: "1/2", icon: "dumbbell", color: "text-fitness-500", bg: "bg-fitness-500/10" },
  { label: "Streak", value: "12 days", icon: "fire", color: "text-yellow-500", bg: "bg-yellow-500/10" },
];

const todayPlan = [
  { time: "07:00", name: "Morning Yoga Flow", type: "yoga", completed: true, duration: "20 min" },
  { time: "12:30", name: "Upper Body Strength", type: "strength", completed: true, duration: "45 min" },
  { time: "18:00", name: "HIIT Cardio Blast", type: "cardio", completed: false, duration: "30 min" },
];

const recentActivity = [
  { user: "Sarah Chen", action: "completed a workout", detail: "Full Body Strength", time: "2h ago", avatar: "SC" },
  { user: "Marcus J.", action: "set a new PR", detail: "Bench Press: 225 lbs", time: "3h ago", avatar: "MJ" },
  { user: "You", action: "logged meal", detail: "Lunch — 650 cal", time: "4h ago", avatar: "JD" },
  { user: "Elena R.", action: "joined challenge", detail: "30-Day Pushup", time: "5h ago", avatar: "ER" },
  { user: "Alex K.", action: "hit goal", detail: "Run 100 miles this month", time: "6h ago", avatar: "AK" },
];

const macroSummary = {
  consumed: { calories: 1450, protein: 85, carbs: 165, fat: 52 },
  goal: { calories: 2200, protein: 150, carbs: 250, fat: 73 },
};

const weeklyWorkouts = [
  { day: "Mon", completed: true, type: "Strength" },
  { day: "Tue", completed: true, type: "Cardio" },
  { day: "Wed", completed: true, type: "Yoga" },
  { day: "Thu", completed: false, type: "HIIT" },
  { day: "Fri", completed: false, type: "Strength" },
  { day: "Sat", completed: false, type: "Rest" },
  { day: "Sun", completed: false, type: "Rest" },
];

function StatIcon({ icon }: { icon: string }) {
  if (icon === "fire") return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>;
  if (icon === "clock") return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
}

export default function DashboardHome() {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, John
        </h1>
        <p className="text-muted-foreground mt-1">
          You&apos;re on a <span className="text-fitness-500 font-medium">12-day streak</span>. Keep it going!
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {todayStats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <span className={stat.color}><StatIcon icon={stat.icon} /></span>
              </div>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Plan */}
        <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Today&apos;s Plan</h2>
            <Link href="/workouts" className="text-sm text-fitness-500 hover:text-fitness-400 transition-colors">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {todayPlan.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-4 rounded-xl border border-border/30 p-4 hover:border-fitness-500/30 transition-colors"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium ${
                  item.completed
                    ? "bg-fitness-500/10 text-fitness-500"
                    : item.type === "cardio"
                    ? "bg-orange-500/10 text-orange-500"
                    : "bg-energy-500/10 text-energy-500"
                }`}>
                  {item.completed ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    item.time
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${item.completed ? "text-muted-foreground line-through" : ""}`}>
                    {item.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{item.duration}</div>
                </div>
                {!item.completed && (
                  <Link
                    href={`/workouts/start/${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                    className="rounded-lg bg-fitness-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-fitness-700 transition-colors"
                  >
                    Start
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Nutrition Summary */}
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Nutrition Today</h2>
            <Link href="/nutrition" className="text-sm text-fitness-500 hover:text-fitness-400 transition-colors">
              Details
            </Link>
          </div>
          <div className="space-y-4">
            {(["calories", "protein", "carbs", "fat"] as const).map((key) => {
              const consumed = macroSummary.consumed[key];
              const goal = macroSummary.goal[key];
              const pct = Math.min((consumed / goal) * 100, 100);
              const labels = { calories: "Cal", protein: "g", carbs: "g", fat: "g" };
              const colors = { calories: "bg-orange-500", protein: "bg-fitness-500", carbs: "bg-energy-500", fat: "bg-purple-500" };
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="capitalize font-medium">{key}</span>
                    <span className="text-muted-foreground">
                      {consumed} / {goal} {labels[key]}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors[key]} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <Link
            href="/nutrition/log"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Log Meal
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Overview */}
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <h2 className="text-lg font-semibold mb-6">This Week</h2>
          <div className="grid grid-cols-7 gap-2">
            {weeklyWorkouts.map((day, i) => (
              <div key={day.day} className="text-center">
                <div className="text-xs text-muted-foreground mb-2">{day.day}</div>
                <div
                  className={`h-16 rounded-xl flex flex-col items-center justify-center text-xs transition-colors ${
                    day.completed
                      ? "bg-fitness-500/10 text-fitness-500 border border-fitness-500/20"
                      : i === selectedDay
                      ? "bg-fitness-500 text-white"
                      : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {day.completed ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-[10px] leading-tight px-1">{day.type}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <h2 className="text-lg font-semibold mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0">
                  {item.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-medium">{item.user}</span>{" "}
                    <span className="text-muted-foreground">{item.action}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{item.detail}</div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Start Workout", href: "/workouts", icon: "M13 10V3L4 14h7v7l9-11h-7z", color: "bg-fitness-600" },
          { label: "Log Food", href: "/nutrition/log", icon: "M12 4v16m8-8H4", color: "bg-orange-600" },
          { label: "Track Weight", href: "/progress", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z", color: "bg-energy-600" },
          { label: "Ask AI Coach", href: "/ai-coach", icon: "M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5", color: "bg-purple-600" },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border/50 bg-card p-4 hover:border-fitness-500/30 hover:shadow-sm transition-all"
          >
            <div className={`rounded-xl p-3 ${action.color} text-white`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
              </svg>
            </div>
            <span className="text-sm font-medium">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
