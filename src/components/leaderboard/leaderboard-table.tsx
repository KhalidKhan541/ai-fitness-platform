import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  className?: string;
}

export default function LeaderboardTable({ entries, currentUserId, className }: LeaderboardTableProps) {
  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card overflow-hidden", className)}>
      <div className="divide-y divide-border/30">
        {entries.map((entry) => (
          <div
            key={entry.userId}
            className={cn(
              "flex items-center gap-4 px-5 py-4 transition-colors",
              entry.userId === currentUserId ? "bg-fitness-500/5" : "hover:bg-muted/30"
            )}
          >
            <div className="w-8 text-center">
              <span className={cn(
                "text-sm font-bold",
                entry.rank <= 3 ? "text-fitness-500" : "text-muted-foreground"
              )}>
                {entry.rank}
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-bold shrink-0">
              {entry.userImage || entry.userName.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn(
                "text-sm font-medium",
                entry.userId === currentUserId && "text-fitness-500"
              )}>
                {entry.userName}
                {entry.userId === currentUserId && " (You)"}
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
  );
}
