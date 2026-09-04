"use client";

import { useState } from "react";

const sleepData = [
  { date: "Mar 19", bedtime: "10:30 PM", wakeTime: "6:15 AM", duration: 7.75, quality: 4, deep: 1.5, rem: 1.8, light: 4.45 },
  { date: "Mar 18", bedtime: "11:00 PM", wakeTime: "6:30 AM", duration: 7.5, quality: 3, deep: 1.2, rem: 1.5, light: 4.8 },
  { date: "Mar 17", bedtime: "10:15 PM", wakeTime: "6:00 AM", duration: 7.75, quality: 5, deep: 1.8, rem: 2.0, light: 3.95 },
  { date: "Mar 16", bedtime: "10:45 PM", wakeTime: "6:15 AM", duration: 7.5, quality: 4, deep: 1.4, rem: 1.7, light: 4.4 },
  { date: "Mar 15", bedtime: "11:15 PM", wakeTime: "6:45 AM", duration: 7.5, quality: 3, deep: 1.1, rem: 1.4, light: 5.0 },
  { date: "Mar 14", bedtime: "10:00 PM", wakeTime: "5:45 AM", duration: 7.75, quality: 5, deep: 1.9, rem: 2.1, light: 3.75 },
  { date: "Mar 13", bedtime: "10:30 PM", wakeTime: "6:00 AM", duration: 7.5, quality: 4, deep: 1.6, rem: 1.9, light: 4.0 },
];

const avgDuration = sleepData.reduce((s, d) => s + d.duration, 0) / sleepData.length;
const avgQuality = sleepData.reduce((s, d) => s + d.quality, 0) / sleepData.length;
const avgDeep = sleepData.reduce((s, d) => s + d.deep, 0) / sleepData.length;
const avgRem = sleepData.reduce((s, d) => s + d.rem, 0) / sleepData.length;

const qualityColors = ["", "text-red-500", "text-orange-500", "text-yellow-500", "text-fitness-500", "text-fitness-400"];
const qualityLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

export default function SleepPage() {
  const [showLogModal, setShowLogModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sleep Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor your rest and recovery</p>
        </div>
        <button
          onClick={() => setShowLogModal(!showLogModal)}
          className="flex items-center gap-2 rounded-xl bg-fitness-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-fitness-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Log Sleep
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Avg Duration", value: `${avgDuration.toFixed(1)}h`, icon: "🌙" },
          { label: "Avg Quality", value: qualityLabels[Math.round(avgQuality)], icon: "⭐" },
          { label: "Avg Deep Sleep", value: `${avgDeep.toFixed(1)}h`, icon: "💤" },
          { label: "Avg REM", value: `${avgRem.toFixed(1)}h`, icon: "🧠" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <span className="text-lg">{s.icon}</span>
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Sleep Log Form */}
      {showLogModal && (
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Log Sleep</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bedtime</label>
              <input
                type="time"
                defaultValue="22:30"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-fitness-500/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Wake Time</label>
              <input
                type="time"
                defaultValue="06:30"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-fitness-500/50"
              />
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <label className="text-sm font-medium">Sleep Quality</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((q) => (
                <button
                  key={q}
                  className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                    q === 4
                      ? "bg-fitness-600 text-white"
                      : "border border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <label className="text-sm font-medium">Notes (optional)</label>
            <textarea
              placeholder="How did you sleep?"
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fitness-500/50 resize-none"
            />
          </div>
          <button className="mt-4 w-full rounded-xl bg-fitness-600 py-2.5 text-sm font-medium text-white hover:bg-fitness-700 transition-colors">
            Save Sleep Log
          </button>
        </div>
      )}

      {/* Sleep History */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h2 className="text-lg font-semibold mb-6">Sleep History</h2>
        <div className="relative h-48 mb-4">
          <svg viewBox="0 0 600 180" className="w-full h-full">
            {sleepData.slice().reverse().map((d, i) => {
              const x = (i / (sleepData.length - 1)) * 560 + 20;
              const barH = (d.duration / 10) * 160;
              return (
                <g key={i}>
                  <rect
                    x={x - 20}
                    y={170 - barH}
                    width={40}
                    height={barH}
                    rx={6}
                    fill={d.quality >= 4 ? "#22c55e" : d.quality === 3 ? "#f59e0b" : "#ef4444"}
                    opacity={0.8}
                  />
                  <text x={x} y={178} textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
                    {d.duration}h
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{sleepData[sleepData.length - 1].date}</span>
          <span>{sleepData[0].date}</span>
        </div>
      </div>

      {/* Sleep Log List */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Nights</h2>
        <div className="space-y-3">
          {sleepData.map((d, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl bg-muted/30 p-4">
              <div className="text-center shrink-0">
                <div className="text-lg font-bold">{d.duration}h</div>
                <div className="text-[10px] text-muted-foreground">{d.date}</div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{d.bedtime}</span>
                  <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span className="text-sm font-medium">{d.wakeTime}</span>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>Deep: {d.deep}h</span>
                  <span>REM: {d.rem}h</span>
                  <span>Light: {d.light}h</span>
                </div>
              </div>
              <div className={`text-sm font-bold ${qualityColors[d.quality]}`}>
                {qualityLabels[d.quality]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
