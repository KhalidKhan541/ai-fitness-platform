"use client";

import { useState } from "react";

const feed = [
  { id: "1", userId: "u1", userName: "Sarah Chen", userImage: "SC", type: "workout" as const, content: "Just crushed a full body strength session!", workoutName: "Full Body Strength", stats: { duration: "45 min", calories: "420 cal", exercises: 8 }, likes: 24, comments: 5, createdAt: "2h ago", liked: false },
  { id: "2", userId: "u2", userName: "Marcus Johnson", userImage: "MJ", type: "achievement" as const, content: "Hit a new PR on bench press! 225 lbs for 3 reps.", stats: { weight: "225 lbs", reps: 3 }, likes: 56, comments: 12, createdAt: "3h ago", liked: true },
  { id: "3", userId: "u3", userName: "Elena Rodriguez", userImage: "ER", type: "milestone" as const, content: "Just completed 100 workouts on FitAI! Thank you to everyone who supported me on this journey.", stats: { workouts: 100 }, likes: 128, comments: 34, createdAt: "5h ago", liked: false },
  { id: "4", userId: "u4", userName: "Alex Kim", userImage: "AK", type: "challenge" as const, content: "Joining the 30-Day Pushup Challenge. Who's in?", stats: { challenge: "30-Day Pushup" }, likes: 18, comments: 8, createdAt: "6h ago", liked: false },
  { id: "5", userId: "u5", userName: "Jordan Davis", userImage: "JD", type: "workout" as const, content: "Morning yoga flow to start the day right.", workoutName: "Morning Yoga Flow", stats: { duration: "20 min", calories: "90 cal" }, likes: 32, comments: 3, createdAt: "8h ago", liked: true },
];

const typeIcons: Record<string, { icon: string; color: string }> = {
  workout: { icon: "🏋️", color: "bg-fitness-500/10 text-fitness-500" },
  achievement: { icon: "🏆", color: "bg-yellow-500/10 text-yellow-500" },
  milestone: { icon: "🎯", color: "bg-purple-500/10 text-purple-500" },
  challenge: { icon: "⚡", color: "bg-orange-500/10 text-orange-500" },
};

export default function SocialFeedPage() {
  const [posts, setPosts] = useState(feed);
  const [newPost, setNewPost] = useState("");

  const toggleLike = (id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity Feed</h1>
        <p className="text-sm text-muted-foreground mt-1">See what your friends are up to</p>
      </div>

      {/* New Post */}
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fitness-500/20 text-sm font-medium text-fitness-400 shrink-0">
            JD
          </div>
          <div className="flex-1">
            <textarea
              placeholder="Share your workout, achievement, or progress..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fitness-500/50 focus:border-fitness-500 transition-colors resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-2">
                <button className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Workout
                </button>
                <button className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Photo
                </button>
              </div>
              <button
                disabled={!newPost.trim()}
                className="rounded-lg bg-fitness-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-fitness-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {posts.map((post) => {
          const typeInfo = typeIcons[post.type];
          return (
            <div key={post.id} className="rounded-2xl border border-border/50 bg-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium shrink-0">
                  {post.userImage}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{post.userName}</div>
                  <div className="text-xs text-muted-foreground">{post.createdAt}</div>
                </div>
                <div className={`rounded-lg px-2 py-1 text-xs font-medium ${typeInfo.color}`}>
                  {typeInfo.icon} {post.type}
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
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-1.5 text-sm transition-colors ${
                    post.liked ? "text-fitness-500" : "text-muted-foreground hover:text-foreground"
                  }`}
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
                <button className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
