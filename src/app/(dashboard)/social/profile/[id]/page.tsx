"use client";

import { useParams } from "next/navigation";

const profileData: Record<string, {
  name: string;
  bio: string;
  joinDate: string;
  workouts: number;
  followers: number;
  following: number;
  streak: number;
  recentWorkouts: { name: string; date: string; duration: string }[];
  achievements: { icon: string; title: string }[];
}> = {
  "1": {
    name: "Sarah Chen",
    bio: "Marathon runner and yoga enthusiast. Training for my first ultra!",
    joinDate: "Jan 2024",
    workouts: 87,
    followers: 234,
    following: 56,
    streak: 15,
    recentWorkouts: [
      { name: "Morning Yoga Flow", date: "Today", duration: "20 min" },
      { name: "Long Run", date: "Yesterday", duration: "65 min" },
      { name: "Core Crusher", date: "2 days ago", duration: "25 min" },
    ],
    achievements: [
      { icon: "🏃", title: "Marathon Finisher" },
      { icon: "🔥", title: "30-Day Streak" },
      { icon: "💪", title: "100 Workouts" },
    ],
  },
};

const defaultProfile = {
  name: "User",
  bio: "Fitness enthusiast",
  joinDate: "Jan 2024",
  workouts: 50,
  followers: 100,
  following: 30,
  streak: 7,
  recentWorkouts: [
    { name: "Workout", date: "Today", duration: "45 min" },
  ],
  achievements: [{ icon: "💪", title: "First Workout" }],
};

export default function SocialProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const profile = profileData[id] || defaultProfile;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-fitness-500 to-energy-500 flex items-center justify-center text-2xl font-bold text-white shrink-0">
            {profile.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{profile.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>
            <div className="text-xs text-muted-foreground mt-2">Joined {profile.joinDate}</div>
          </div>
          <button className="rounded-xl bg-fitness-600 px-4 py-2 text-sm font-medium text-white hover:bg-fitness-700 transition-colors">
            Follow
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-border/30">
          <div className="text-center">
            <div className="text-lg font-bold">{profile.workouts}</div>
            <div className="text-xs text-muted-foreground">Workouts</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{profile.streak}</div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{profile.followers}</div>
            <div className="text-xs text-muted-foreground">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{profile.following}</div>
            <div className="text-xs text-muted-foreground">Following</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h2 className="text-sm font-semibold mb-4">Recent Workouts</h2>
        <div className="space-y-3">
          {profile.recentWorkouts.map((w, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fitness-500/10 text-fitness-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{w.name}</div>
                <div className="text-xs text-muted-foreground">{w.date}</div>
              </div>
              <span className="text-xs text-muted-foreground">{w.duration}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h2 className="text-sm font-semibold mb-4">Achievements</h2>
        <div className="flex flex-wrap gap-2">
          {profile.achievements.map((a, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
              <span>{a.icon}</span>
              <span className="text-xs font-medium">{a.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
