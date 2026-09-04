import Link from "next/link";

const sidebarLinks = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
      { name: "Workouts", href: "/dashboard/workouts", icon: "M6 6h.01M6 18h.01M18 6h.01M18 18h.01M6 12h12" },
      { name: "Exercises", href: "/dashboard/exercises", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
    ],
  },
  {
    label: "Tracking",
    items: [
      { name: "Nutrition", href: "/dashboard/nutrition", icon: "M12 2C9.5 2 8 3.5 8 6c0 1 .5 2 1 2.5-.5.5-1 1-1 2 0 2 1.5 3 3 3s3-1 3-3c0-1-.5-1.5-1-2 .5-.5 1-1.5 1-2.5 0-2.5-1.5-4-4-4z" },
      { name: "Progress", href: "/dashboard/progress", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
      { name: "Body", href: "/dashboard/body", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
      { name: "Sleep", href: "/dashboard/sleep", icon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" },
    ],
  },
  {
    label: "Social",
    items: [
      { name: "Feed", href: "/dashboard/social/feed", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" },
      { name: "Challenges", href: "/dashboard/challenges", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
      { name: "Leaderboard", href: "/dashboard/leaderboard", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
    ],
  },
  {
    label: "Plans",
    items: [
      { name: "Training Plans", href: "/dashboard/plans", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
      { name: "Goals", href: "/dashboard/goals", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
      { name: "AI Coach", href: "/dashboard/ai-coach", icon: "M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5" },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border/40 bg-card/50 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-2 border-b border-border/40 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-fitness-500 to-energy-500">
          <span className="text-sm font-bold text-white">F</span>
        </div>
        <span className="text-lg font-bold tracking-tight">
          Fit<span className="text-fitness-500">AI</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {sidebarLinks.map((group) => (
          <div key={group.label} className="mb-6">
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border/40 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-fitness-500/20 text-sm font-medium text-fitness-400">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">John Doe</div>
            <div className="text-xs text-muted-foreground truncate">john@example.com</div>
          </div>
          <Link href="/dashboard/settings" className="text-muted-foreground hover:text-foreground transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </div>
    </aside>
  );
}
