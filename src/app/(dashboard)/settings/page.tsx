"use client";

import { useState } from "react";

const sections = [
  {
    title: "Profile",
    fields: [
      { label: "Full Name", type: "text", value: "John Doe" },
      { label: "Email", type: "email", value: "john@example.com" },
      { label: "Phone", type: "tel", value: "+1 (555) 123-4567" },
    ],
  },
  {
    title: "Fitness Profile",
    fields: [
      { label: "Height", type: "text", value: "5'10\" (178 cm)" },
      { label: "Starting Weight", type: "text", value: "185 lbs" },
      { label: "Current Weight", type: "text", value: "178 lbs" },
      { label: "Goal Weight", type: "text", value: "170 lbs" },
      { label: "Date of Birth", type: "date", value: "1990-05-15" },
    ],
  },
];

const preferences = [
  { label: "Units", value: "Imperial (lbs, inches)", options: ["Imperial (lbs, inches)", "Metric (kg, cm)"] },
  { label: "Difficulty Level", value: "Intermediate", options: ["Beginner", "Intermediate", "Advanced"] },
  { label: "Workout Duration", value: "45-60 min", options: ["15-30 min", "30-45 min", "45-60 min", "60+ min"] },
  { label: "Workouts Per Week", value: "4-5", options: ["2-3", "3-4", "4-5", "5-6", "6-7"] },
];

const notifications = [
  { label: "Workout Reminders", description: "Get reminded before scheduled workouts", enabled: true },
  { label: "Meal Logging", description: "Reminders to log your meals", enabled: true },
  { label: "Social Activity", description: "Notifications from friends and challenges", enabled: false },
  { label: "Achievement Alerts", description: "Celebrate when you hit milestones", enabled: true },
  { label: "Weekly Reports", description: "Summary of your weekly progress", enabled: true },
  { label: "AI Coach Tips", description: "Daily tips and insights from your AI coach", enabled: false },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "notifications" | "account">("profile");
  const [notifState, setNotifState] = useState(notifications);

  const toggleNotif = (idx: number) => {
    setNotifState((prev) =>
      prev.map((n, i) => (i === idx ? { ...n, enabled: !n.enabled } : n))
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-56 shrink-0">
          <div className="flex lg:flex-col gap-2 overflow-x-auto">
            {(["profile", "preferences", "notifications", "account"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium capitalize rounded-xl transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-fitness-600 text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {activeTab === "profile" && (
            <>
              {/* Avatar */}
              <div className="rounded-2xl border border-border/50 bg-card p-6">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-fitness-500 to-energy-500 flex items-center justify-center text-2xl font-bold text-white">
                    JD
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">John Doe</h3>
                    <p className="text-sm text-muted-foreground">john@example.com</p>
                    <button className="mt-2 text-sm text-fitness-500 hover:text-fitness-400 transition-colors">
                      Change Photo
                    </button>
                  </div>
                </div>
              </div>

              {sections.map((section) => (
                <div key={section.title} className="rounded-2xl border border-border/50 bg-card p-6">
                  <h3 className="text-sm font-semibold mb-4">{section.title}</h3>
                  <div className="space-y-4">
                    {section.fields.map((field) => (
                      <div key={field.label} className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label className="text-sm text-muted-foreground w-40 shrink-0">{field.label}</label>
                        <input
                          type={field.type}
                          defaultValue={field.value}
                          className="flex-1 h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-fitness-500/50"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button className="rounded-xl bg-fitness-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-fitness-700 transition-colors">
                Save Changes
              </button>
            </>
          )}

          {activeTab === "preferences" && (
            <div className="rounded-2xl border border-border/50 bg-card p-6">
              <h3 className="text-sm font-semibold mb-4">Training Preferences</h3>
              <div className="space-y-4">
                {preferences.map((pref) => (
                  <div key={pref.label} className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="text-sm text-muted-foreground w-40 shrink-0">{pref.label}</label>
                    <select
                      defaultValue={pref.value}
                      className="flex-1 h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-fitness-500/50"
                    >
                      {pref.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <button className="mt-6 rounded-xl bg-fitness-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-fitness-700 transition-colors">
                Save Preferences
              </button>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="rounded-2xl border border-border/50 bg-card p-6">
              <h3 className="text-sm font-semibold mb-4">Notifications</h3>
              <div className="space-y-1">
                {notifState.map((n, i) => (
                  <div key={n.label} className="flex items-center justify-between py-3 border-b border-border/20 last:border-0">
                    <div>
                      <div className="text-sm font-medium">{n.label}</div>
                      <div className="text-xs text-muted-foreground">{n.description}</div>
                    </div>
                    <button
                      onClick={() => toggleNotif(i)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        n.enabled ? "bg-fitness-600" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          n.enabled ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "account" && (
            <>
              <div className="rounded-2xl border border-border/50 bg-card p-6">
                <h3 className="text-sm font-semibold mb-4">Change Password</h3>
                <div className="space-y-4 max-w-md">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Current Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fitness-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fitness-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fitness-500/50"
                    />
                  </div>
                  <button className="rounded-xl bg-fitness-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-fitness-700 transition-colors">
                    Update Password
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-destructive/20 bg-card p-6">
                <h3 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <button className="rounded-xl border border-destructive px-6 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                  Delete Account
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
