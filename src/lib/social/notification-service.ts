import { z } from "zod";
import {
  format,
  parseISO,
  subHours,
  subDays,
  isAfter,
  differenceInMinutes,
} from "date-fns";

// ─── Enums & Constants ──────────────────────────────────────────────

export enum NotificationType {
  LIKE_POST = "LIKE_POST",
  COMMENT_POST = "COMMENT_POST",
  LIKE_COMMENT = "LIKE_COMMENT",
  REPLY_COMMENT = "REPLY_COMMENT",
  NEW_FOLLOWER = "NEW_FOLLOWER",
  FOLLOW_ACCEPTED = "FOLLOW_ACCEPTED",
  CHALLENGE_INVITE = "CHALLENGE_INVITE",
  CHALLENGE_STARTED = "CHALLENGE_STARTED",
  CHALLENGE_PROGRESS = "CHALLENGE_PROGRESS",
  CHALLENGE_COMPLETED = "CHALLENGE_COMPLETED",
  CHALLENGE_WON = "CHALLENGE_WON",
  ACHIEVEMENT_UNLOCKED = "ACHIEVEMENT_UNLOCKED",
  ACHIEVEMENT_NEAR = "ACHIEVEMENT_NEAR",
  GOAL_REMINDER = "GOAL_REMINDER",
  GOAL_MILESTONE = "GOAL_MILESTONE",
  GOAL_COMPLETED = "GOAL_COMPLETED",
  GOAL_FAILED = "GOAL_FAILED",
  STREAK_MILESTONE = "STREAK_MILESTONE",
  STREAK_WARNING = "STREAK_WARNING",
  WORKOUT_REMINDER = "WORKOUT_REMINDER",
  FRIEND_ACTIVITY = "FRIEND_ACTIVITY",
  DIRECT_MESSAGE = "DIRECT_MESSAGE",
  TEAM_INVITE = "TEAM_INVITE",
  PLAN_REMINDER = "PLAN_REMINDER",
  SYSTEM_UPDATE = "SYSTEM_UPDATE",
  WEEKLY_SUMMARY = "WEEKLY_SUMMARY",
}

export enum NotificationPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum NotificationChannel {
  IN_APP = "IN_APP",
  PUSH = "PUSH",
  EMAIL = "EMAIL",
  SMS = "SMS",
}

export const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationType,
  {
    label: string;
    icon: string;
    color: string;
    defaultPriority: NotificationPriority;
    defaultChannels: NotificationChannel[];
    category: string;
    coalesceKey: string;
  }
> = {
  [NotificationType.LIKE_POST]: {
    label: "New Like",
    icon: "❤️",
    color: "#ef4444",
    defaultPriority: NotificationPriority.LOW,
    defaultChannels: [NotificationChannel.IN_APP],
    category: "social",
    coalesceKey: "like_post",
  },
  [NotificationType.COMMENT_POST]: {
    label: "New Comment",
    icon: "💬",
    color: "#3b82f6",
    defaultPriority: NotificationPriority.MEDIUM,
    defaultChannels: [NotificationChannel.IN_APP],
    category: "social",
    coalesceKey: "comment_post",
  },
  [NotificationType.LIKE_COMMENT]: {
    label: "Comment Liked",
    icon: "👍",
    color: "#22c55e",
    defaultPriority: NotificationPriority.LOW,
    defaultChannels: [NotificationChannel.IN_APP],
    category: "social",
    coalesceKey: "like_comment",
  },
  [NotificationType.REPLY_COMMENT]: {
    label: "Comment Reply",
    icon: "↩️",
    color: "#6366f1",
    defaultPriority: NotificationPriority.MEDIUM,
    defaultChannels: [NotificationChannel.IN_APP],
    category: "social",
    coalesceKey: "reply_comment",
  },
  [NotificationType.NEW_FOLLOWER]: {
    label: "New Follower",
    icon: "👥",
    color: "#ec4899",
    defaultPriority: NotificationPriority.MEDIUM,
    defaultChannels: [NotificationChannel.IN_APP],
    category: "social",
    coalesceKey: "new_follower",
  },
  [NotificationType.FOLLOW_ACCEPTED]: {
    label: "Follow Accepted",
    icon: "✅",
    color: "#10b981",
    defaultPriority: NotificationPriority.LOW,
    defaultChannels: [NotificationChannel.IN_APP],
    category: "social",
    coalesceKey: "follow_accepted",
  },
  [NotificationType.CHALLENGE_INVITE]: {
    label: "Challenge Invite",
    icon: "🏆",
    color: "#f59e0b",
    defaultPriority: NotificationPriority.HIGH,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    category: "challenge",
    coalesceKey: "challenge_invite",
  },
  [NotificationType.CHALLENGE_STARTED]: {
    label: "Challenge Started",
    icon: "🚀",
    color: "#0ea5e9",
    defaultPriority: NotificationPriority.MEDIUM,
    defaultChannels: [NotificationChannel.IN_APP],
    category: "challenge",
    coalesceKey: "challenge_started",
  },
  [NotificationType.CHALLENGE_PROGRESS]: {
    label: "Challenge Update",
    icon: "📊",
    color: "#8b5cf6",
    defaultPriority: NotificationPriority.LOW,
    defaultChannels: [NotificationChannel.IN_APP],
    category: "challenge",
    coalesceKey: "challenge_progress",
  },
  [NotificationType.CHALLENGE_COMPLETED]: {
    label: "Challenge Completed",
    icon: "🎉",
    color: "#22c55e",
    defaultPriority: NotificationPriority.HIGH,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    category: "challenge",
    coalesceKey: "challenge_completed",
  },
  [NotificationType.CHALLENGE_WON]: {
    label: "Challenge Won!",
    icon: "🥇",
    color: "#eab308",
    defaultPriority: NotificationPriority.URGENT,
    defaultChannels: [
      NotificationChannel.IN_APP,
      NotificationChannel.PUSH,
      NotificationChannel.EMAIL,
    ],
    category: "challenge",
    coalesceKey: "challenge_won",
  },
  [NotificationType.ACHIEVEMENT_UNLOCKED]: {
    label: "Achievement Unlocked!",
    icon: "🏅",
    color: "#f59e0b",
    defaultPriority: NotificationPriority.HIGH,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    category: "achievement",
    coalesceKey: "achievement_unlocked",
  },
  [NotificationType.ACHIEVEMENT_NEAR]: {
    label: "Achievement Almost There",
    icon: "🎯",
    color: "#06b6d4",
    defaultPriority: NotificationPriority.LOW,
    defaultChannels: [NotificationChannel.IN_APP],
    category: "achievement",
    coalesceKey: "achievement_near",
  },
  [NotificationType.GOAL_REMINDER]: {
    label: "Goal Reminder",
    icon: "⏰",
    color: "#f97316",
    defaultPriority: NotificationPriority.MEDIUM,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    category: "goal",
    coalesceKey: "goal_reminder",
  },
  [NotificationType.GOAL_MILESTONE]: {
    label: "Goal Milestone!",
    icon: "⭐",
    color: "#a855f7",
    defaultPriority: NotificationPriority.HIGH,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    category: "goal",
    coalesceKey: "goal_milestone",
  },
  [NotificationType.GOAL_COMPLETED]: {
    label: "Goal Completed!",
    icon: "✅",
    color: "#10b981",
    defaultPriority: NotificationPriority.URGENT,
    defaultChannels: [
      NotificationChannel.IN_APP,
      NotificationChannel.PUSH,
      NotificationChannel.EMAIL,
    ],
    category: "goal",
    coalesceKey: "goal_completed",
  },
  [NotificationType.GOAL_FAILED]: {
    label: "Goal Expired",
    icon: "❌",
    color: "#ef4444",
    defaultPriority: NotificationPriority.MEDIUM,
    defaultChannels: [NotificationChannel.IN_APP],
    category: "goal",
    coalesceKey: "goal_failed",
  },
  [NotificationType.STREAK_MILESTONE]: {
    label: "Streak Milestone!",
    icon: "🔥",
    color: "#f97316",
    defaultPriority: NotificationPriority.HIGH,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    category: "fitness",
    coalesceKey: "streak_milestone",
  },
  [NotificationType.STREAK_WARNING]: {
    label: "Streak at Risk!",
    icon: "⚠️",
    color: "#ef4444",
    defaultPriority: NotificationPriority.URGENT,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    category: "fitness",
    coalesceKey: "streak_warning",
  },
  [NotificationType.WORKOUT_REMINDER]: {
    label: "Workout Reminder",
    icon: "🏋️",
    color: "#22c55e",
    defaultPriority: NotificationPriority.MEDIUM,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    category: "fitness",
    coalesceKey: "workout_reminder",
  },
  [NotificationType.FRIEND_ACTIVITY]: {
    label: "Friend Activity",
    icon: "👥",
    color: "#6366f1",
    defaultPriority: NotificationPriority.LOW,
    defaultChannels: [NotificationChannel.IN_APP],
    category: "social",
    coalesceKey: "friend_activity",
  },
  [NotificationType.DIRECT_MESSAGE]: {
    label: "New Message",
    icon: "✉️",
    color: "#0ea5e9",
    defaultPriority: NotificationPriority.HIGH,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    category: "social",
    coalesceKey: "direct_message",
  },
  [NotificationType.TEAM_INVITE]: {
    label: "Team Invite",
    icon: "🤝",
    color: "#8b5cf6",
    defaultPriority: NotificationPriority.HIGH,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    category: "challenge",
    coalesceKey: "team_invite",
  },
  [NotificationType.PLAN_REMINDER]: {
    label: "Plan Reminder",
    icon: "📋",
    color: "#14b8a6",
    defaultPriority: NotificationPriority.MEDIUM,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    category: "fitness",
    coalesceKey: "plan_reminder",
  },
  [NotificationType.SYSTEM_UPDATE]: {
    label: "System Update",
    icon: "🔔",
    color: "#6b7280",
    defaultPriority: NotificationPriority.LOW,
    defaultChannels: [NotificationChannel.IN_APP],
    category: "system",
    coalesceKey: "system_update",
  },
  [NotificationType.WEEKLY_SUMMARY]: {
    label: "Weekly Summary",
    icon: "📊",
    color: "#3b82f6",
    defaultPriority: NotificationPriority.MEDIUM,
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    category: "system",
    coalesceKey: "weekly_summary",
  },
};

// ─── Validation Schemas ─────────────────────────────────────────────

export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.nativeEnum(NotificationType),
  title: z.string().max(200).optional(),
  message: z.string().max(1000),
  priority: z.nativeEnum(NotificationPriority).optional(),
  channels: z.array(z.nativeEnum(NotificationChannel)).optional(),
  metadata: z.record(z.unknown()).optional(),
  actionUrl: z.string().url().optional(),
  expiresAt: z.string().datetime().optional(),
  groupKey: z.string().optional(),
});

export const notificationPreferencesSchema = z.object({
  userId: z.string().uuid(),
  emailEnabled: z.boolean().default(true),
  pushEnabled: z.boolean().default(true),
  smsEnabled: z.boolean().default(false),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  typePreferences: z
    .record(
      z.object({
        enabled: z.boolean(),
        channels: z.array(z.nativeEnum(NotificationChannel)),
      })
    )
    .optional(),
});

// ─── Types ──────────────────────────────────────────────────────────

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type NotificationPreferencesInput = z.infer<
  typeof notificationPreferencesSchema
>;

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  icon: string;
  color: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  metadata: Record<string, unknown>;
  actionUrl: string | null;
  isRead: boolean;
  isSeen: boolean;
  readAt: string | null;
  seenAt: string | null;
  expiresAt: string | null;
  groupKey: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  typePreferences: Record<
    NotificationType,
    { enabled: boolean; channels: NotificationChannel[] }
  >;
}

export interface NotificationGroup {
  key: string;
  type: NotificationType;
  notifications: Notification[];
  count: number;
  latestNotification: Notification;
  isRead: boolean;
}

export interface NotificationStats {
  total: number;
  unread: number;
  unreadByCategory: Record<string, number>;
  recentCount: number;
  todayCount: number;
  weekCount: number;
}

// ─── Service ────────────────────────────────────────────────────────

export class NotificationService {
  private notifications: Map<string, Notification[]> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private cooldowns: Map<string, Map<string, number>> = new Map();

  async createNotification(
    input: CreateNotificationInput
  ): Promise<Notification | null> {
    const validated = createNotificationSchema.parse(input);
    const prefs = this.preferences.get(validated.userId);

    const config = NOTIFICATION_TYPE_CONFIG[validated.type];

    if (prefs) {
      const typePref = prefs.typePreferences[validated.type];
      if (typePref && !typePref.enabled) return null;

      if (this.isQuietHours(prefs)) {
        if (
          validated.priority !== NotificationPriority.URGENT
        ) {
          return null;
        }
      }
    }

    const cooldownKey = `${validated.userId}_${validated.type}_${validated.groupKey ?? "default"}`;
    const cooldowns = this.cooldowns.get(validated.userId) ?? new Map();
    const lastSent = cooldowns.get(cooldownKey);
    const now = Date.now();

    if (lastSent) {
      const cooldownMs = this.getCooldownMs(validated.type);
      if (now - lastSent < cooldownMs) {
        return null;
      }
    }

    cooldowns.set(cooldownKey, now);
    this.cooldowns.set(validated.userId, cooldowns);

    const notification: Notification = {
      id: crypto.randomUUID(),
      userId: validated.userId,
      type: validated.type,
      title: validated.title ?? config.label,
      message: validated.message,
      icon: config.icon,
      color: config.color,
      priority: validated.priority ?? config.defaultPriority,
      channels: validated.channels ?? config.defaultChannels,
      metadata: validated.metadata ?? {},
      actionUrl: validated.actionUrl ?? null,
      isRead: false,
      isSeen: false,
      readAt: null,
      seenAt: null,
      expiresAt: validated.expiresAt ?? null,
      groupKey: validated.groupKey ?? null,
      createdAt: new Date().toISOString(),
    };

    const userNotifications =
      this.notifications.get(validated.userId) ?? [];
    userNotifications.unshift(notification);

    if (userNotifications.length > 500) {
      userNotifications.splice(500);
    }

    this.notifications.set(validated.userId, userNotifications);

    return notification;
  }

  async getNotifications(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      types?: NotificationType[];
      unreadOnly?: boolean;
      category?: string;
    }
  ): Promise<{ notifications: Notification[]; total: number }> {
    let userNotifications = this.notifications.get(userId) ?? [];

    if (options?.types && options.types.length > 0) {
      userNotifications = userNotifications.filter((n) =>
        options.types!.includes(n.type)
      );
    }

    if (options?.unreadOnly) {
      userNotifications = userNotifications.filter((n) => !n.isRead);
    }

    if (options?.category) {
      userNotifications = userNotifications.filter((n) => {
        const config = NOTIFICATION_TYPE_CONFIG[n.type];
        return config.category === options.category;
      });
    }

    userNotifications = userNotifications.filter((n) => {
      if (n.expiresAt) {
        return isAfter(parseISO(n.expiresAt), new Date());
      }
      return true;
    });

    const total = userNotifications.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;

    return {
      notifications: userNotifications.slice(offset, offset + limit),
      total,
    };
  }

  async getGroupedNotifications(
    userId: string,
    options?: { limit?: number }
  ): Promise<NotificationGroup[]> {
    const userNotifications = this.notifications.get(userId) ?? [];
    const groups: Map<string, NotificationGroup> = new Map();

    for (const notification of userNotifications) {
      if (notification.expiresAt && isAfter(parseISO(notification.expiresAt), new Date()) === false) {
        continue;
      }

      const groupKey =
        notification.groupKey ?? `${notification.type}_${notification.id}`;

      const existing = groups.get(groupKey);
      if (existing) {
        existing.notifications.push(notification);
        existing.count++;
        if (
          new Date(notification.createdAt).getTime() >
          new Date(existing.latestNotification.createdAt).getTime()
        ) {
          existing.latestNotification = notification;
        }
        if (!notification.isRead) existing.isRead = false;
      } else {
        groups.set(groupKey, {
          key: groupKey,
          type: notification.type,
          notifications: [notification],
          count: 1,
          latestNotification: notification,
          isRead: notification.isRead,
        });
      }
    }

    const grouped = Array.from(groups.values())
      .sort(
        (a, b) =>
          new Date(b.latestNotification.createdAt).getTime() -
          new Date(a.latestNotification.createdAt).getTime()
      );

    const limit = options?.limit ?? 50;
    return grouped.slice(0, limit);
  }

  async markAsRead(
    userId: string,
    notificationId: string
  ): Promise<boolean> {
    const userNotifications = this.notifications.get(userId) ?? [];
    const notification = userNotifications.find(
      (n) => n.id === notificationId
    );
    if (!notification) return false;

    notification.isRead = true;
    notification.readAt = new Date().toISOString();
    return true;
  }

  async markAsSeen(userId: string, notificationId: string): Promise<boolean> {
    const userNotifications = this.notifications.get(userId) ?? [];
    const notification = userNotifications.find(
      (n) => n.id === notificationId
    );
    if (!notification) return false;

    notification.isSeen = true;
    notification.seenAt = new Date().toISOString();
    return true;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const userNotifications = this.notifications.get(userId) ?? [];
    let count = 0;
    const now = new Date().toISOString();

    for (const notification of userNotifications) {
      if (!notification.isRead) {
        notification.isRead = true;
        notification.readAt = now;
        count++;
      }
    }

    return count;
  }

  async markAllAsSeen(userId: string): Promise<number> {
    const userNotifications = this.notifications.get(userId) ?? [];
    let count = 0;
    const now = new Date().toISOString();

    for (const notification of userNotifications) {
      if (!notification.isSeen) {
        notification.isSeen = true;
        notification.seenAt = now;
        count++;
      }
    }

    return count;
  }

  async deleteNotification(
    userId: string,
    notificationId: string
  ): Promise<boolean> {
    const userNotifications = this.notifications.get(userId) ?? [];
    const index = userNotifications.findIndex(
      (n) => n.id === notificationId
    );
    if (index === -1) return false;

    userNotifications.splice(index, 1);
    return true;
  }

  async deleteAllNotifications(userId: string): Promise<number> {
    const count = (this.notifications.get(userId) ?? []).length;
    this.notifications.set(userId, []);
    return count;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const userNotifications = this.notifications.get(userId) ?? [];
    return userNotifications.filter(
      (n) => !n.isRead && !this.isExpired(n)
    ).length;
  }

  async getNotificationStats(userId: string): Promise<NotificationStats> {
    const userNotifications = this.notifications.get(userId) ?? [];
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const weekAgo = subDays(now, 7);

    const validNotifications = userNotifications.filter(
      (n) => !this.isExpired(n)
    );

    const unreadByCategory: Record<string, number> = {};
    let recentCount = 0;
    let todayCount = 0;
    let weekCount = 0;

    for (const n of validNotifications) {
      if (!n.isRead) {
        const config = NOTIFICATION_TYPE_CONFIG[n.type];
        unreadByCategory[config.category] =
          (unreadByCategory[config.category] ?? 0) + 1;
      }

      const createdAt = parseISO(n.createdAt);
      if (differenceInMinutes(now, createdAt) < 60) recentCount++;
      if (isAfter(createdAt, todayStart)) todayCount++;
      if (isAfter(createdAt, weekAgo)) weekCount++;
    }

    return {
      total: validNotifications.length,
      unread: validNotifications.filter((n) => !n.isRead).length,
      unreadByCategory,
      recentCount,
      todayCount,
      weekCount,
    };
  }

  async updatePreferences(
    prefs: NotificationPreferencesInput
  ): Promise<NotificationPreferences> {
    const existing = this.preferences.get(prefs.userId);

    const preferences: NotificationPreferences = {
      userId: prefs.userId,
      emailEnabled: prefs.emailEnabled ?? existing?.emailEnabled ?? true,
      pushEnabled: prefs.pushEnabled ?? existing?.pushEnabled ?? true,
      smsEnabled: prefs.smsEnabled ?? existing?.smsEnabled ?? false,
      quietHoursStart:
        prefs.quietHoursStart ?? existing?.quietHoursStart ?? null,
      quietHoursEnd: prefs.quietHoursEnd ?? existing?.quietHoursEnd ?? null,
      typePreferences: prefs.typePreferences
        ? (prefs.typePreferences as Record<
            NotificationType,
            { enabled: boolean; channels: NotificationChannel[] }
          >)
        : existing?.typePreferences ?? this.getDefaultTypePreferences(),
    };

    this.preferences.set(prefs.userId, preferences);
    return preferences;
  }

  async getPreferences(
    userId: string
  ): Promise<NotificationPreferences> {
    return (
      this.preferences.get(userId) ?? {
        userId,
        emailEnabled: true,
        pushEnabled: true,
        smsEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        typePreferences: this.getDefaultTypePreferences(),
      }
    );
  }

  async cleanupExpired(userId: string): Promise<number> {
    const userNotifications = this.notifications.get(userId) ?? [];
    const before = userNotifications.length;

    const filtered = userNotifications.filter(
      (n) => !this.isExpired(n)
    );
    this.notifications.set(userId, filtered);

    return before - filtered.length;
  }

  async sendBulkNotifications(
    userIds: string[],
    type: NotificationType,
    message: string,
    metadata: Record<string, unknown> = {}
  ): Promise<Notification[]> {
    const results: Notification[] = [];

    for (const userId of userIds) {
      const notification = await this.createNotification({
        userId,
        type,
        message,
        metadata,
      });
      if (notification) results.push(notification);
    }

    return results;
  }

  private isExpired(notification: Notification): boolean {
    if (!notification.expiresAt) return false;
    return !isAfter(parseISO(notification.expiresAt), new Date());
  }

  private isQuietHours(prefs: NotificationPreferences): boolean {
    if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;

    const [startH, startM] = prefs.quietHoursStart.split(":").map(Number);
    const [endH, endM] = prefs.quietHoursEnd.split(":").map(Number);

    const startTime = startH * 60 + startM;
    const endTime = endH * 60 + endM;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    }
    return currentTime >= startTime || currentTime <= endTime;
  }

  private getCooldownMs(type: NotificationType): number {
    const config = NOTIFICATION_TYPE_CONFIG[type];
    switch (config.category) {
      case "social":
        return 30 * 1000;
      case "challenge":
        return 60 * 1000;
      case "achievement":
        return 5 * 1000;
      case "goal":
        return 5 * 60 * 1000;
      case "fitness":
        return 5 * 60 * 1000;
      default:
        return 60 * 1000;
    }
  }

  private getDefaultTypePreferences(): Record<
    NotificationType,
    { enabled: boolean; channels: NotificationChannel[] }
  > {
    return Object.values(NotificationType).reduce((acc, type) => {
      const config = NOTIFICATION_TYPE_CONFIG[type];
      acc[type] = {
        enabled: true,
        channels: config.defaultChannels,
      };
      return acc;
    }, {} as Record<NotificationType, { enabled: boolean; channels: NotificationChannel[] }>);
  }
}

export const notificationService = new NotificationService();
