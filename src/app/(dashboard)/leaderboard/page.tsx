"use client";

import { useState } from "react";

const leaderboardData = [
  { rank: 1, userId: "u1", userName: "Alex Kim", userImage: "AK", score: 9850, change: "up" as const },
  { rank: 2, userId: "u2", userName: "Sarah Chen", userImage: "SC", score: 9420, change: "up" as const },
  { rank: 3, userId: "u3", userName: "Marcus Johnson", userImage: "MJ", score: 9100, change: "down" as const },
  { rank: 4, userId: "u4", userName: "You", userImage: "JD", score: 8750, change: "same" as const },
  { rank: 5, userId: "u5", userName: "Elena Rodriguez", userImage: "ER", score: 8300, change: "up" as const },
  { rank: 6, userId: "u6", userName: "Jordan Davis", userImage: "JD2", score: 7900, change: "down" as const },
  { rank: 7, userId: "u7", userName: "Mike Thompson", userImage: "MT", score: 7450, change: "up" as const },
  { rank: 8, userId: "u8", userName: "Lisa Wang", userImage: "LW", score: 7100, change: "same" as const },
  { rank: 9, userId: "u9", userName: "Chris Brown", userImage: "CB", score: 6800, change: "down" as const },
  { rank: 10, userId: "u10", userName: "Amanda Lee", userImage: "AL", score: 6500, change: "up" as const },
];

const timeframes = ["This Week", "This Month", "All Time"];

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState("This Week");
  const [category, setCategory] = useState("Overall");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-muted-foreground mt-1">See how you stack up against the community</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                timeframe === tf
                  ? "bg-fitness-600 text-white"
                  : "border border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-fitness-500/50"
        >
          <option>Overall</option>
          <option>Workouts</option>
          <option>Calories</option>
          <option>Streak</option>
        </select>
      </div>

      {/* Top 3 */}
      <div className="grid grid-cols-3 gap-4">
        {[leaderboardData[1], leaderboardData[0], leaderboardData[2]].map((entry, i) => {
          const position = [2, 1, 3][i];
          const heights = ["h-20", "h-24", "h-16"];
          const medals = ["🥈", "🥇", "🥉"];
          return (
            <div key={entry.userId} className="flex flex-col items-center">
              <div className={`text-3xl mb-2`}>{medals[i]}</div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-bold mb-2">
                {entry.userImage}
              </div>
              <div className="text-sm font-medium text-center">{entry.userName}</div>
              <div className="text-xs text-muted-foreground">{entry.score.toLocaleString()} pts</div>
              <div className={`w-16 ${heights[i]} rounded-t-xl mt-2 ${
                position === 1 ? "bg-yellow-500/20" : position === 2 ? "bg-gray-400/20" : "bg-orange-500/20"
              }`} />
            </div>
          );
        })}
      </div>

      {/* Full Table */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="divide-y divide-border/30">
          {leaderboardData.map((entry) => (
            <div
              key={entry.userId}
              className={`flex items-center gap-4 px-5 py-4 ${
                entry.userName === "You" ? "bg-fitness-500/5" : "hover:bg-muted/30"
              } transition-colors`}
            >
              <div className="w-8 text-center">
                <span className={`text-sm font-bold ${
                  entry.rank <= 3 ? "text-fitness-500" : "text-muted-foreground"
                }`}>
                  {entry.rank}
                </span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-bold shrink-0">
                {entry.userImage}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${entry.userName === "You" ? "text-fitness-500" : ""}`}>
                  {entry.userName}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{entry.score.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">points</div>
              </div>
              <div className="w-6 flex justify-center">
                {entry.change === "up" && (
                  <svg className="h-4 w-4 text-fitness-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                )}
                {entry.change === "down" && (
                  <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
                {entry.change === "same" && (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
