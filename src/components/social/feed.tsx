"use client";

import { useState } from "react";
import ActivityCard from "./activity-card";
import type { SocialPost } from "@/types";

interface FeedProps {
  initialPosts?: SocialPost[];
}

export default function Feed({ initialPosts = [] }: FeedProps) {
  const [posts, setPosts] = useState<SocialPost[]>(initialPosts);
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
    <div className="space-y-4">
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
            <div className="flex items-center justify-end mt-2">
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

      {posts.map((post) => (
        <ActivityCard key={post.id} post={post} onLike={toggleLike} />
      ))}
    </div>
  );
}
