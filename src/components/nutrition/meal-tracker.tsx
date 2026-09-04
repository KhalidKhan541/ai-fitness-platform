"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Meal } from "@/types";

interface MealTrackerProps {
  meals: Meal[];
  onAddMeal: (meal: Omit<Meal, "id">) => void;
  onRemoveMeal: (id: string) => void;
}

const mealTypes = [
  { key: "breakfast" as const, label: "Breakfast", icon: "🌅" },
  { key: "lunch" as const, label: "Lunch", icon: "☀️" },
  { key: "dinner" as const, label: "Dinner", icon: "🌙" },
  { key: "snack" as const, label: "Snack", icon: "🍎" },
];

export default function MealTracker({ meals, onAddMeal, onRemoveMeal }: MealTrackerProps) {
  const [activeType, setActiveType] = useState<Meal["type"]>("lunch");

  const grouped = mealTypes.map((mt) => ({
    ...mt,
    items: meals.filter((m) => m.type === mt.key),
    totalCal: meals.filter((m) => m.type === mt.key).reduce((s, m) => s + m.calories, 0),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {grouped.map((g) => (
          <button
            key={g.key}
            onClick={() => setActiveType(g.key)}
            className={cn(
              "rounded-xl p-3 text-center text-sm font-medium transition-colors",
              activeType === g.key
                ? "bg-fitness-600 text-white"
                : "border border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <span className="text-lg block mb-1">{g.icon}</span>
            {g.label}
            {g.items.length > 0 && (
              <div className="text-[10px] opacity-75 mt-0.5">{g.totalCal} cal</div>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {grouped
          .find((g) => g.key === activeType)
          ?.items.map((meal) => (
            <div key={meal.id} className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{meal.name}</div>
                <div className="text-xs text-muted-foreground">
                  {meal.calories} cal • P:{meal.protein}g C:{meal.carbs}g F:{meal.fat}g
                </div>
              </div>
              <button
                onClick={() => onRemoveMeal(meal.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

        {grouped.find((g) => g.key === activeType)?.items.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No items logged for this meal yet.
          </div>
        )}
      </div>
    </div>
  );
}
