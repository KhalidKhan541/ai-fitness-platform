"use client";

import { useState } from "react";
import Link from "next/link";

const foodDatabase = [
  { name: "Chicken Breast", calories: 165, protein: 31, carbs: 0, fat: 3.6, per: "100g" },
  { name: "Brown Rice", calories: 216, protein: 5, carbs: 45, fat: 1.8, per: "1 cup" },
  { name: "Banana", calories: 105, protein: 1.3, carbs: 27, fat: 0.4, per: "1 medium" },
  { name: "Oatmeal", calories: 154, protein: 5, carbs: 27, fat: 2.6, per: "1 cup" },
  { name: "Greek Yogurt", calories: 100, protein: 17, carbs: 6, fat: 0.7, per: "170g" },
  { name: "Egg", calories: 78, protein: 6, carbs: 0.6, fat: 5, per: "1 large" },
  { name: "Salmon", calories: 208, protein: 20, carbs: 0, fat: 13, per: "100g" },
  { name: "Sweet Potato", calories: 103, protein: 2.3, carbs: 24, fat: 0.1, per: "1 medium" },
  { name: "Almonds", calories: 164, protein: 6, carbs: 6, fat: 14, per: "1 oz" },
  { name: "Broccoli", calories: 55, protein: 3.7, carbs: 11, fat: 0.6, per: "1 cup" },
];

export default function FoodLogPage() {
  const [search, setSearch] = useState("");
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
  const [loggedFoods, setLoggedFoods] = useState<typeof foodDatabase>([]);
  const [showSearch, setShowSearch] = useState(true);

  const filtered = foodDatabase.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const addFood = (food: typeof foodDatabase[0]) => {
    setLoggedFoods((prev) => [...prev, food]);
    setSearch("");
  };

  const removeFood = (idx: number) => {
    setLoggedFoods((prev) => prev.filter((_, i) => i !== idx));
  };

  const totals = loggedFoods.reduce(
    (acc, f) => ({
      calories: acc.calories + f.calories,
      protein: acc.protein + f.protein,
      carbs: acc.carbs + f.carbs,
      fat: acc.fat + f.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const mealTypes = [
    { key: "breakfast" as const, label: "Breakfast", icon: "🌅" },
    { key: "lunch" as const, label: "Lunch", icon: "☀️" },
    { key: "dinner" as const, label: "Dinner", icon: "🌙" },
    { key: "snack" as const, label: "Snack", icon: "🍎" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/nutrition" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Log Food</h1>
        <p className="text-sm text-muted-foreground mt-1">Add items to your meal</p>
      </div>

      {/* Meal Type Selector */}
      <div className="grid grid-cols-4 gap-2">
        {mealTypes.map((m) => (
          <button
            key={m.key}
            onClick={() => setMealType(m.key)}
            className={`rounded-xl p-3 text-center text-sm font-medium transition-colors ${
              mealType === m.key
                ? "bg-fitness-600 text-white"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="text-lg block mb-1">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search foods..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowSearch(true); }}
          onFocus={() => setShowSearch(true)}
          className="h-11 w-full rounded-xl border border-border bg-muted/50 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fitness-500/50 focus:border-fitness-500 transition-colors"
        />
      </div>

      {/* Search Results */}
      {showSearch && search && (
        <div className="rounded-2xl border border-border/50 bg-card divide-y divide-border/30">
          {filtered.map((food, i) => (
            <button
              key={i}
              onClick={() => { addFood(food); setShowSearch(false); }}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{food.name}</div>
                <div className="text-xs text-muted-foreground">{food.per}</div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div className="font-medium text-foreground">{food.calories} cal</div>
                <div>P:{food.protein}g C:{food.carbs}g F:{food.fat}g</div>
              </div>
              <svg className="h-4 w-4 text-fitness-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">No foods found</div>
          )}
        </div>
      )}

      {/* Logged Foods */}
      {loggedFoods.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Added Items ({loggedFoods.length})</h3>
          <div className="space-y-2">
            {loggedFoods.map((food, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{food.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {food.calories} cal • P:{food.protein}g C:{food.carbs}g F:{food.fat}g
                  </div>
                </div>
                <button onClick={() => removeFood(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-orange-500">{totals.calories}</div>
                <div className="text-xs text-muted-foreground">Calories</div>
              </div>
              <div>
                <div className="text-lg font-bold text-fitness-500">{totals.protein.toFixed(1)}g</div>
                <div className="text-xs text-muted-foreground">Protein</div>
              </div>
              <div>
                <div className="text-lg font-bold text-energy-500">{totals.carbs.toFixed(1)}g</div>
                <div className="text-xs text-muted-foreground">Carbs</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-500">{totals.fat.toFixed(1)}g</div>
                <div className="text-xs text-muted-foreground">Fat</div>
              </div>
            </div>
          </div>

          <button className="mt-4 w-full rounded-xl bg-fitness-600 py-3 text-sm font-medium text-white hover:bg-fitness-700 transition-colors">
            Save Meal
          </button>
        </div>
      )}
    </div>
  );
}
