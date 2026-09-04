"use client";

import { useState } from "react";
import Link from "next/link";

const meals = [
  { type: "Breakfast", time: "08:30", items: ["Oatmeal with berries", "Scrambled eggs x2"], calories: 420, protein: 28, carbs: 48, fat: 14 },
  { type: "Lunch", time: "12:30", items: ["Grilled chicken breast", "Brown rice", "Mixed vegetables"], calories: 580, protein: 45, carbs: 62, fat: 12 },
  { type: "Snack", time: "15:00", items: ["Greek yogurt", "Almonds"], calories: 210, protein: 18, carbs: 12, fat: 11 },
  { type: "Dinner", time: "19:00", items: ["Salmon fillet", "Sweet potato", "Steamed broccoli"], calories: 520, protein: 38, carbs: 42, fat: 22 },
];

const goals = { calories: 2200, protein: 160, carbs: 250, fat: 73 };
const totals = meals.reduce(
  (acc, m) => ({
    calories: acc.calories + m.calories,
    protein: acc.protein + m.protein,
    carbs: acc.carbs + m.carbs,
    fat: acc.fat + m.fat,
  }),
  { calories: 0, protein: 0, carbs: 0, fat: 0 }
);

const waterGoal = 8;
const [waterLogged, setWaterLogged] = useState;

export default function NutritionPage() {
  const [water, setWater] = useState(5);

  const macros = [
    { label: "Calories", current: totals.calories, goal: goals.calories, unit: "kcal", color: "bg-orange-500" },
    { label: "Protein", current: totals.protein, goal: goals.protein, unit: "g", color: "bg-fitness-500" },
    { label: "Carbs", current: totals.carbs, goal: goals.carbs, unit: "g", color: "bg-energy-500" },
    { label: "Fat", current: totals.fat, goal: goals.fat, unit: "g", color: "bg-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nutrition Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">Today&apos;s intake</p>
        </div>
        <Link
          href="/nutrition/log"
          className="flex items-center gap-2 rounded-xl bg-fitness-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-fitness-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Log Food
        </Link>
      </div>

      {/* Macro Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {macros.map((m) => {
          const pct = Math.min((m.current / m.goal) * 100, 100);
          return (
            <div key={m.label} className="rounded-2xl border border-border/50 bg-card p-4">
              <div className="text-sm text-muted-foreground mb-3">{m.label}</div>
              <div className="text-2xl font-bold mb-1">
                {m.current}<span className="text-sm font-normal text-muted-foreground">/{m.goal}{m.unit}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${m.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
              </div>
              <div className="text-xs text-muted-foreground mt-2">{Math.round(pct)}% of goal</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meals */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Meals</h2>
          {meals.map((meal) => (
            <div key={meal.type} className="rounded-2xl border border-border/50 bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold">{meal.type}</h3>
                  <div className="text-xs text-muted-foreground">{meal.time}</div>
                </div>
                <div className="text-sm font-medium">{meal.calories} cal</div>
              </div>
              <div className="space-y-1 mb-3">
                {meal.items.map((item) => (
                  <div key={item} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-fitness-500" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>P: {meal.protein}g</span>
                <span>C: {meal.carbs}g</span>
                <span>F: {meal.fat}g</span>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Water Tracker */}
          <div className="rounded-2xl border border-border/50 bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Water Intake</h3>
            <div className="flex items-center justify-center gap-1 mb-4">
              {Array.from({ length: waterGoal }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setWater(i < water ? i : i + 1)}
                  className={`h-8 w-8 rounded-lg transition-colors ${
                    i < water
                      ? "bg-energy-500 text-white"
                      : "bg-muted text-muted-foreground hover:bg-energy-500/20"
                  }`}
                >
                  <svg className="h-4 w-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21c-4.97 0-9-4.03-9-9 0-3.53 5-11 9-11s9 7.47 9 11c0 4.97-4.03 9-9 9z" />
                  </svg>
                </button>
              ))}
            </div>
            <div className="text-center text-sm text-muted-foreground">
              {water} / {waterGoal} glasses
            </div>
          </div>

          {/* Macro Pie Chart (simplified) */}
          <div className="rounded-2xl border border-border/50 bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Macro Split</h3>
            <div className="flex items-center justify-center gap-6">
              <div className="relative h-32 w-32">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none" stroke="#22c55e" strokeWidth="3"
                    strokeDasharray={`${(totals.protein / totals.calories) * 100 * 0.4} 100`}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none" stroke="#0ea5e9" strokeWidth="3"
                    strokeDasharray={`${(totals.carbs / totals.calories) * 100 * 0.4} 100`}
                    strokeDashoffset={`-${(totals.protein / totals.calories) * 100 * 0.4}`}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none" stroke="#8b5cf6" strokeWidth="3"
                    strokeDasharray={`${(totals.fat / totals.calories) * 100 * 0.4} 100`}
                    strokeDashoffset={`-${((totals.protein + totals.carbs) / totals.calories) * 100 * 0.4}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-bold">{totals.calories}</div>
                    <div className="text-[10px] text-muted-foreground">kcal</div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full bg-fitness-500" />
                  Protein {totals.protein}g
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full bg-energy-500" />
                  Carbs {totals.carbs}g
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  Fat {totals.fat}g
                </div>
              </div>
            </div>
          </div>

          {/* AI Suggestion */}
          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5" />
              </svg>
              <span className="text-sm font-semibold text-purple-400">AI Suggestion</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You&apos;re 600 calories under goal. Consider adding a protein-rich snack like cottage cheese or a protein shake before bed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
