import { cn } from "@/lib/utils";
import type { SocialPost } from "@/types";

interface ActivityCardProps {
  post: SocialPost;
  onLike?: (id: string) => void;
  className?: string;
}

const typeConfig: Record<string, { icon: string; color: string }> = {
  workout: { icon: "🏋️", color: "bg-fitness-500/10 text-fitness-500" },
  achievement: { icon: "🏆", color: "bg-yellow-500/10 text-yellow-500" },
  milestone: { icon: "🎯", color: "bg-purple-500/10 text-purple-500" },
  challenge: { icon: "⚡", color: "bg-orange-500/10 text-orange-500" },
};

export default function ActivityCard({ post, onLike, className }: ActivityCardProps) {
  const config = typeConfig[post.type] || typeConfig.workout;

  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card p-5", className)}>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium shrink-0">
          {post.userImage || post.userName.split(" ").map((n) => n[0]).join("")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{post.userName}</div>
          <div className="text-xs text-muted-foreground">{post.createdAt}</div>
        </div>
        <div className={cn("rounded-lg px-2 py-1 text-xs font-medium", config.color)}>
          {config.icon} {post.type}
        </div>
      </div>

      <p className="text-sm mb-3">{post.content}</p>

      {post.workoutName && (
        <div className="rounded-xl bg-muted/50 p-3 mb-3">
          <div className="text-xs text-muted-foreground mb-1">Workout</div>
          <div className="text-sm font-medium">{post.workoutName}</div>
        </div>
      )}

      {post.stats && (
        <div className="flex gap-3 mb-3">
          {Object.entries(post.stats).map(([key, val]) => (
            <div key={key} className="rounded-lg bg-muted/50 px-3 py-1.5">
              <span className="text-xs text-muted-foreground capitalize">{key}: </span>
              <span className="text-xs font-medium">{String(val)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 pt-3 border-t border-border/30">
        <button
          onClick={() => onLike?.(post.id)}
          className={cn(
            "flex items-center gap-1.5 text-sm transition-colors",
            post.liked ? "text-fitness-500" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {post.liked ? (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
          {post.likes}
        </button>
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {post.comments}
        </button>
      </div>
    </div>
  );
}
