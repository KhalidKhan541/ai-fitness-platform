"use client";

import { useState } from "react";

const measurements = [
  { date: "Mar 19, 2024", weight: 178.0, bodyFat: 18.2, chest: 42, waist: 34, hips: 40, biceps: 14.5, thighs: 24, neck: 15.5, forearms: 11, calves: 15 },
  { date: "Mar 1, 2024", weight: 179.1, bodyFat: 18.8, chest: 41.5, waist: 34.5, hips: 40.5, biceps: 14, thighs: 23.5, neck: 15.5, forearms: 10.8, calves: 14.8 },
  { date: "Feb 15, 2024", weight: 180.2, bodyFat: 19.3, chest: 41, waist: 35, hips: 41, biceps: 13.8, thighs: 23, neck: 15.5, forearms: 10.5, calves: 14.5 },
  { date: "Feb 1, 2024", weight: 181.4, bodyFat: 19.9, chest: 40.5, waist: 35.5, hips: 41, biceps: 13.5, thighs: 22.5, neck: 15.5, forearms: 10.3, calves: 14.3 },
];

const bmi = (weight: number, heightCm: number = 178) => {
  const m = heightCm / 100;
  return (weight / (m * m)).toFixed(1);
};

const bmiCategory = (val: number) => {
  if (val < 18.5) return { label: "Underweight", color: "text-energy-500" };
  if (val < 25) return { label: "Normal", color: "text-fitness-500" };
  if (val < 30) return { label: "Overweight", color: "text-yellow-500" };
  return { label: "Obese", color: "text-red-500" };
};

export default function BodyPage() {
  const [showForm, setShowForm] = useState(false);
  const latest = measurements[0];
  const bmiVal = parseFloat(bmi(latest.weight));
  const bmiInfo = bmiCategory(bmiVal);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Body Measurements</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your body composition</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-xl bg-fitness-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-fitness-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Measurements
        </button>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="text-sm text-muted-foreground mb-1">Weight</div>
          <div className="text-2xl font-bold">{latest.weight} lbs</div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="text-sm text-muted-foreground mb-1">Body Fat</div>
          <div className="text-2xl font-bold">{latest.bodyFat}%</div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="text-sm text-muted-foreground mb-1">BMI</div>
          <div className="text-2xl font-bold">{bmiVal}</div>
          <div className={`text-xs ${bmiInfo.color}`}>{bmiInfo.label}</div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="text-sm text-muted-foreground mb-1">Lean Mass</div>
          <div className="text-2xl font-bold">{(latest.weight * (1 - latest.bodyFat / 100)).toFixed(1)} lbs</div>
        </div>
      </div>

      {/* Log Form */}
      {showForm && (
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Log Measurements</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Weight (lbs)", placeholder: "178.0" },
              { label: "Body Fat %", placeholder: "18.2" },
              { label: "Chest (in)", placeholder: "42" },
              { label: "Waist (in)", placeholder: "34" },
              { label: "Hips (in)", placeholder: "40" },
              { label: "Biceps (in)", placeholder: "14.5" },
              { label: "Thighs (in)", placeholder: "24" },
              { label: "Neck (in)", placeholder: "15.5" },
            ].map((field) => (
              <div key={field.label} className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder={field.placeholder}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fitness-500/50"
                />
              </div>
            ))}
          </div>
          <button className="mt-4 w-full rounded-xl bg-fitness-600 py-2.5 text-sm font-medium text-white hover:bg-fitness-700 transition-colors">
            Save Measurements
          </button>
        </div>
      )}

      {/* Body Map */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h2 className="text-lg font-semibold mb-6">Current Measurements</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "Chest", value: latest.chest, unit: "in", color: "bg-muscle-chest" },
            { label: "Waist", value: latest.waist, unit: "in", color: "bg-muscle-core" },
            { label: "Hips", value: latest.hips, unit: "in", color: "bg-purple-500" },
            { label: "Biceps", value: latest.biceps, unit: "in", color: "bg-muscle-arms" },
            { label: "Thighs", value: latest.thighs, unit: "in", color: "bg-muscle-legs" },
            { label: "Neck", value: latest.neck, unit: "in", color: "bg-energy-500" },
            { label: "Forearms", value: latest.forearms, unit: "in", color: "bg-muscle-arms" },
            { label: "Calves", value: latest.calves, unit: "in", color: "bg-muscle-legs" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl bg-muted/30 p-4 flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg ${m.color} opacity-20`} />
              <div>
                <div className="text-xs text-muted-foreground">{m.label}</div>
                <div className="text-lg font-bold">{m.value}{m.unit}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Measurement History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border/30">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Weight</th>
                <th className="pb-3 font-medium">BF%</th>
                <th className="pb-3 font-medium">Chest</th>
                <th className="pb-3 font-medium">Waist</th>
                <th className="pb-3 font-medium">Hips</th>
                <th className="pb-3 font-medium">Biceps</th>
                <th className="pb-3 font-medium">Thighs</th>
              </tr>
            </thead>
            <tbody>
              {measurements.map((m, i) => (
                <tr key={i} className="border-b border-border/20">
                  <td className="py-3 font-medium whitespace-nowrap">{m.date}</td>
                  <td className="py-3 text-muted-foreground">{m.weight}</td>
                  <td className="py-3 text-muted-foreground">{m.bodyFat}%</td>
                  <td className="py-3 text-muted-foreground">{m.chest}"</td>
                  <td className="py-3 text-muted-foreground">{m.waist}"</td>
                  <td className="py-3 text-muted-foreground">{m.hips}"</td>
                  <td className="py-3 text-muted-foreground">{m.biceps}"</td>
                  <td className="py-3 text-muted-foreground">{m.thighs}"</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
