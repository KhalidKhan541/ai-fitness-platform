"use client";

import { useState } from "react";

const weightData = [
  { date: "Jan 1", weight: 185 },
  { date: "Jan 8", weight: 184.2 },
  { date: "Jan 15", weight: 183.5 },
  { date: "Jan 22", weight: 182.8 },
  { date: "Jan 29", weight: 182.1 },
  { date: "Feb 5", weight: 181.4 },
  { date: "Feb 12", weight: 180.9 },
  { date: "Feb 19", weight: 180.2 },
  { date: "Feb 26", weight: 179.8 },
  { date: "Mar 5", weight: 179.1 },
  { date: "Mar 12", weight: 178.5 },
  { date: "Mar 19", weight: 178.0 },
];

const measurements = [
  { date: "Mar 19", chest: 42, waist: 34, hips: 40, biceps: 14.5, thighs: 24 },
  { date: "Mar 1", chest: 41.5, waist: 34.5, hips: 40.5, biceps: 14, thighs: 23.5 },
  { date: "Feb 15", chest: 41, waist: 35, hips: 41, biceps: 13.8, thighs: 23 },
  { date: "Feb 1", chest: 40.5, waist: 35.5, hips: 41, biceps: 13.5, thighs: 22.5 },
];

const photos = [
  { date: "Mar 19, 2024", type: "front", url: "/progress/front-mar.jpg" },
  { date: "Mar 19, 2024", type: "side", url: "/progress/side-mar.jpg" },
  { date: "Mar 19, 2024", type: "back", url: "/progress/back-mar.jpg" },
  { date: "Feb 1, 2024", type: "front", url: "/progress/front-feb.jpg" },
  { date: "Feb 1, 2024", type: "side", url: "/progress/side-feb.jpg" },
  { date: "Feb 1, 2024", type: "back", url: "/progress/back-feb.jpg" },
];

const stats = [
  { label: "Current Weight", value: "178.0 lbs", change: "-7.0 lbs", changeType: "down" },
  { label: "Body Fat", value: "18.2%", change: "-2.1%", changeType: "down" },
  { label: "BMI", value: "24.1", change: "-0.9", changeType: "down" },
  { label: "Goal Weight", value: "170 lbs", remaining: "8 lbs to go" },
];

export default function ProgressPage() {
  const [activeTab, setActiveTab] = useState<"weight" | "measurements" | "photos">("weight");

  const minWeight = Math.min(...weightData.map((d) => d.weight));
  const maxWeight = Math.max(...weightData.map((d) => d.weight));
  const range = maxWeight - minWeight;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Progress Tracking</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor your transformation</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border/50 bg-card p-4">
            <div className="text-sm text-muted-foreground mb-2">{s.label}</div>
            <div className="text-2xl font-bold">{s.value}</div>
            {s.change && (
              <div className={`text-xs mt-1 ${s.changeType === "down" ? "text-fitness-500" : "text-red-500"}`}>
                {s.change}
              </div>
            )}
            {s.remaining && (
              <div className="text-xs text-muted-foreground mt-1">{s.remaining}</div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-b border-border/40 pb-px">
        {(["weight", "measurements", "photos"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "text-fitness-500 border-b-2 border-fitness-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "weight" && (
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Weight Trend</h2>
            <span className="text-sm text-fitness-500 font-medium">-7.0 lbs total</span>
          </div>
          <div className="relative h-64">
            <svg viewBox="0 0 600 250" className="w-full h-full">
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map((i) => (
                <line key={i} x1="0" y1={i * 62.5} x2="600" y2={i * 62.5} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.5" />
              ))}
              {/* Area */}
              <path
                d={`M ${weightData.map((d, i) => `${(i / (weightData.length - 1)) * 580 + 10},${240 - ((d.weight - minWeight) / range) * 220}`).join(" L ")} L 590,250 L 10,250 Z`}
                fill="url(#weightGrad)"
              />
              {/* Line */}
              <polyline
                points={weightData.map((d, i) => `${(i / (weightData.length - 1)) * 580 + 10},${240 - ((d.weight - minWeight) / range) * 220}`).join(" ")}
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Dots */}
              {weightData.map((d, i) => (
                <circle
                  key={i}
                  cx={(i / (weightData.length - 1)) * 580 + 10}
                  cy={240 - ((d.weight - minWeight) / range) * 220}
                  r="4"
                  fill="#22c55e"
                  stroke="hsl(var(--card))"
                  strokeWidth="2"
                />
              ))}
            </svg>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{weightData[0].date}</span>
            <span>{weightData[weightData.length - 1].date}</span>
          </div>
        </div>
      )}

      {activeTab === "measurements" && (
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <h2 className="text-lg font-semibold mb-6">Body Measurements (inches)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/30">
                  <th className="pb-3 font-medium">Date</th>
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
                    <td className="py-3 font-medium">{m.date}</td>
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
      )}

      {activeTab === "photos" && (
        <div className="space-y-4">
          {["Mar 19, 2024", "Feb 1, 2024"].map((date) => (
            <div key={date} className="rounded-2xl border border-border/50 bg-card p-6">
              <h3 className="text-sm font-semibold mb-4">{date}</h3>
              <div className="grid grid-cols-3 gap-4">
                {["front", "side", "back"].map((type) => (
                  <div key={type} className="aspect-[3/4] rounded-xl bg-muted flex flex-col items-center justify-center text-muted-foreground">
                    <svg className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs capitalize">{type} view</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button className="w-full rounded-xl border border-dashed border-border py-4 text-sm text-muted-foreground hover:bg-muted/30 transition-colors">
            + Add Progress Photos
          </button>
        </div>
      )}
    </div>
  );
}
