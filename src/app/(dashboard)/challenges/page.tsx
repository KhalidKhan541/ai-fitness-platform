"use client";

import { useState } from "react";

const challenges = [
  { id: "1", title: "30-Day Pushup Challenge", description: "Complete 5000 pushups in 30 days", type: "pushups", target: 5000, unit: "pushups", participants: 2340, startDate: "2024-03-01", endDate: "2024-03-31", joined: true, progress: 1850, daysLeft: 18 },
  { id: "2", title: "Plank Master", description: "Hold a 5-minute plank by end of month", type: "plank", target: 300, unit: "seconds", participants: 890, startDate: "2024-03-01", endDate: "2024-03-31", joined: false, progress: 0, daysLeft: 18 },
  { id: "3", title: "100 Miles Running", description: "Run 100 miles in March", type: "running", target: 100, unit: "miles", participants: 1560, startDate: "2024-03-01", endDate: "2024-03-31", joined: true, progress: 62, daysLeft: 18 },
  { id: "4", title: "No Sugar Week", description: "Go 7 days without added sugar", type: "custom", target: 7, unit: "days", participants: 4200, startDate: "2024-03-18", endDate: "2024-03-24", joined: false, progress: 0, daysLeft: 5 },
  { id: "5", title: "10K Steps Daily", description: "Walk 10,000 steps every day for 2 weeks", type: "custom", target: 14, unit: "days", participants: 3100, startDate: "2024-03-10", endDate: "2024-03-24", joined: true, progress: 10, daysLeft: 5 },
];

export default function ChallengesPage() {
  const [tab, setTab] = useState<"active" | "explore">("active");
  const activeChallenges = challenges.filter((c) => c.joined);
  const exploreChallenges = challenges.filter((c) => !c.joined);

  const displayChallenges = tab === "active" ? activeChallenges : exploreChallenges;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Challenges</h1>
        <p className="text-sm text-muted-foreground mt-1">Compete and push your limits</p>
      </div>

      <div className="flex gap-2 border-b border-border/40 pb-px">
        {(["active", "explore"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
              t === tab
                ? "text-fitness-500 border-b-2 border-fitness-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "active" ? `My Challenges (${activeChallenges.length})` : `Explore (${exploreChallenges.length})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayChallenges.map((ch) => {
          const pct = ch.joined ? Math.min((ch.progress / ch.target) * 100, 100) : 0;
          return (
            <div
              key={ch.id}
              className="rounded-2xl border border-border/50 bg-card p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold">{ch.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{ch.description}</p>
                </div>
                <span className="rounded-lg bg-muted px-2 py-1 text-[10px] font-medium capitalize">
                  {ch.type}
                </span>
              </div>

              {ch.joined && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {ch.progress} / {ch.target} {ch.unit}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-fitness-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {ch.participants.toLocaleString()}
                  </span>
                  <span>{ch.daysLeft} days left</span>
                </div>
                {ch.joined ? (
                  <span className="rounded-lg bg-fitness-500/10 px-3 py-1.5 text-xs font-medium text-fitness-500">
                    Joined
                  </span>
                ) : (
                  <button className="rounded-lg bg-fitness-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-fitness-700 transition-colors">
                    Join
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
