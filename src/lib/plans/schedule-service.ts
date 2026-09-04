import { z } from "zod";
import {
  addDays,
  addWeeks,
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isAfter,
  isBefore,
  differenceInDays,
  getDay,
  setHours,
  setMinutes,
} from "date-fns";

// ─── Enums & Constants ──────────────────────────────────────────────

export enum ScheduleSlotType {
  WORKOUT = "WORKOUT",
  REST = "REST",
  ACTIVE_RECOVERY = "ACTIVE_RECOVERY",
  MEAL = "MEAL",
  SLEEP = "SLEEP",
  CUSTOM = "CUSTOM",
}

export enum ReminderType {
  WORKOUT_START = "WORKOUT_START",
  WORKOUT_COMPLETE = "WORKOUT_COMPLETE",
  MEAL_TIME = "MEAL_TIME",
  HYDRATION = "HYDRATION",
  SLEEP = "SLEEP",
  STRETCH = "STRETCH",
  CUSTOM = "CUSTOM",
}

export enum CalendarSource {
  INTERNAL = "INTERNAL",
  GOOGLE = "GOOGLE",
  APPLE = "APPLE",
  OUTLOOK = "OUTLOOK",
}

export const SLOT_TYPE_CONFIG: Record<
  ScheduleSlotType,
  { label: string; icon: string; color: string; defaultDuration: number }
> = {
  [ScheduleSlotType.WORKOUT]: {
    label: "Workout",
    icon: "🏋️",
    color: "#22c55e",
    defaultDuration: 60,
  },
  [ScheduleSlotType.REST]: {
    label: "Rest",
    icon: "😴",
    color: "#6b7280",
    defaultDuration: 0,
  },
  [ScheduleSlotType.ACTIVE_RECOVERY]: {
    label: "Active Recovery",
    icon: "🧘",
    color: "#06b6d4",
    defaultDuration: 30,
  },
  [ScheduleSlotType.MEAL]: {
    label: "Meal",
    icon: "🍽️",
    color: "#f59e0b",
    defaultDuration: 30,
  },
  [ScheduleSlotType.SLEEP]: {
    label: "Sleep",
    icon: "🌙",
    color: "#8b5cf6",
    defaultDuration: 480,
  },
  [ScheduleSlotType.CUSTOM]: {
    label: "Custom",
    icon: "⚙️",
    color: "#6366f1",
    defaultDuration: 30,
  },
};

// ─── Validation Schemas ─────────────────────────────────────────────

export const scheduleSlotSchema = z.object({
  type: z.nativeEnum(ScheduleSlotType),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  date: z.string().datetime(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isRecurring: z.boolean().default(false),
  recurringDays: z.array(z.number().int().min(0).max(6)).optional(),
  recurringEndDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
  planId: z.string().uuid().optional(),
  workoutDayId: z.string().uuid().optional(),
});

export const createReminderSchema = z.object({
  userId: z.string().uuid(),
  type: z.nativeEnum(ReminderType),
  title: z.string().min(1).max(200),
  message: z.string().max(500).optional(),
  scheduledTime: z.string().datetime(),
  isRecurring: z.boolean().default(false),
  recurringDays: z.array(z.number().int().min(0).max(6)).optional(),
  recurringTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  enabled: z.boolean().default(true),
  advanceMinutes: z.number().int().min(0).max(120).default(15),
  metadata: z.record(z.unknown()).optional(),
});

// ─── Types ──────────────────────────────────────────────────────────

export type ScheduleSlotInput = z.infer<typeof scheduleSlotSchema>;
export type CreateReminderInput = z.infer<typeof createReminderSchema>;

export interface ScheduleSlot {
  id: string;
  userId: string;
  type: ScheduleSlotType;
  title: string;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  isRecurring: boolean;
  recurringDays: number[];
  recurringEndDate: string | null;
  metadata: Record<string, unknown>;
  planId: string | null;
  workoutDayId: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleReminder {
  id: string;
  userId: string;
  type: ReminderType;
  title: string;
  message: string | null;
  scheduledTime: string;
  isRecurring: boolean;
  recurringDays: number[];
  recurringTime: string | null;
  enabled: boolean;
  advanceMinutes: number;
  lastTriggered: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklySchedule {
  weekStart: string;
  weekEnd: string;
  days: Array<{
    date: string;
    dayName: string;
    isToday: boolean;
    slots: ScheduleSlot[];
    workoutCount: number;
    restDay: boolean;
    totalDuration: number;
  }>;
  totalWorkouts: number;
  totalDuration: number;
  restDays: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: ScheduleSlotType;
  color: string;
  metadata: Record<string, unknown>;
}

export interface ScheduleConflict {
  slot1Id: string;
  slot2Id: string;
  slot1Title: string;
  slot2Title: string;
  overlapMinutes: number;
  suggestedResolution: string;
}

export interface ScheduleStats {
  totalSlots: number;
  completedSlots: number;
  adherenceRate: number;
  averageWorkoutDuration: number;
  mostCommonWorkoutTime: string;
  restDayAdherence: number;
  weeklyWorkoutFrequency: number;
  scheduleConsistency: number;
}

// ─── Service ────────────────────────────────────────────────────────

export class ScheduleService {
  private slots: Map<string, ScheduleSlot[]> = new Map();
  private reminders: Map<string, ScheduleReminder[]> = new Map();
  private completedSlots: Map<string, Set<string>> = new Map();

  async createSlot(input: ScheduleSlotInput): Promise<ScheduleSlot> {
    const validated = scheduleSlotSchema.parse(input);
    const now = new Date().toISOString();

    const startParts = validated.startTime.split(":").map(Number);
    const endParts = validated.endTime.split(":").map(Number);
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];
    const duration = Math.max(endMinutes - startMinutes, 0);

    const slot: ScheduleSlot = {
      id: crypto.randomUUID(),
      userId: validated.userId ?? "system",
      type: validated.type,
      title: validated.title,
      description: validated.description ?? null,
      date: validated.date,
      startTime: validated.startTime,
      endTime: validated.endTime,
      duration,
      isRecurring: validated.isRecurring,
      recurringDays: validated.recurringDays ?? [],
      recurringEndDate: validated.recurringEndDate ?? null,
      metadata: validated.metadata ?? {},
      planId: validated.planId ?? null,
      workoutDayId: validated.workoutDayId ?? null,
      isCompleted: false,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const userSlots = this.slots.get(validated.userId) ?? [];
    userSlots.push(slot);
    this.slots.set(validated.userId, userSlots);

    return slot;
  }

  async updateSlot(
    slotId: string,
    userId: string,
    updates: Partial<ScheduleSlotInput>
  ): Promise<ScheduleSlot | null> {
    const userSlots = this.slots.get(userId) ?? [];
    const slot = userSlots.find((s) => s.id === slotId);
    if (!slot) return null;

    if (updates.title !== undefined) slot.title = updates.title;
    if (updates.description !== undefined) slot.description = updates.description;
    if (updates.date !== undefined) slot.date = updates.date;
    if (updates.startTime !== undefined) slot.startTime = updates.startTime;
    if (updates.endTime !== undefined) slot.endTime = updates.endTime;
    if (updates.type !== undefined) slot.type = updates.type;
    if (updates.metadata !== undefined) slot.metadata = updates.metadata;

    if (updates.startTime || updates.endTime) {
      const startParts = (updates.startTime ?? slot.startTime).split(":").map(Number);
      const endParts = (updates.endTime ?? slot.endTime).split(":").map(Number);
      slot.duration = Math.max(
        endParts[0] * 60 + endParts[1] - (startParts[0] * 60 + startParts[1]),
        0
      );
    }

    slot.updatedAt = new Date().toISOString();
    return slot;
  }

  async deleteSlot(slotId: string, userId: string): Promise<boolean> {
    const userSlots = this.slots.get(userId) ?? [];
    const index = userSlots.findIndex((s) => s.id === slotId);
    if (index === -1) return false;

    userSlots.splice(index, 1);
    return true;
  }

  async getSlot(slotId: string, userId: string): Promise<ScheduleSlot | null> {
    const userSlots = this.slots.get(userId) ?? [];
    return userSlots.find((s) => s.id === slotId) ?? null;
  }

  async getWeeklySchedule(
    userId: string,
    weekStart?: string
  ): Promise<WeeklySchedule> {
    const start = weekStart
      ? startOfWeek(parseISO(weekStart))
      : startOfWeek(new Date());
    const end = endOfWeek(start);

    const days = eachDayOfInterval({ start, end });
    const today = new Date();
    const userSlots = this.slots.get(userId) ?? [];

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const scheduleDays = days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const daySlots = userSlots.filter(
        (slot) =>
          format(parseISO(slot.date), "yyyy-MM-dd") === dayStr
      );

      daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

      const workoutCount = daySlots.filter(
        (s) => s.type === ScheduleSlotType.WORKOUT
      ).length;
      const restDay =
        workoutCount === 0 &&
        daySlots.every((s) => s.type === ScheduleSlotType.REST);
      const totalDuration = daySlots.reduce((sum, s) => sum + s.duration, 0);

      return {
        date: dayStr,
        dayName: dayNames[getDay(day)],
        isToday: isSameDay(day, today),
        slots: daySlots,
        workoutCount,
        restDay,
        totalDuration,
      };
    });

    const totalWorkouts = scheduleDays.reduce(
      (sum, d) => sum + d.workoutCount,
      0
    );
    const totalDuration = scheduleDays.reduce(
      (sum, d) => sum + d.totalDuration,
      0
    );
    const restDays = scheduleDays.filter((d) => d.restDay).length;

    return {
      weekStart: format(start, "yyyy-MM-dd"),
      weekEnd: format(end, "yyyy-MM-dd"),
      days: scheduleDays,
      totalWorkouts,
      totalDuration,
      restDays,
    };
  }

  async getDaySchedule(
    userId: string,
    date: string
  ): Promise<ScheduleSlot[]> {
    const userSlots = this.slots.get(userId) ?? [];
    const daySlots = userSlots.filter(
      (slot) =>
        format(parseISO(slot.date), "yyyy-MM-dd") ===
        format(parseISO(date), "yyyy-MM-dd")
    );

    daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return daySlots;
  }

  async getUpcomingSlots(
    userId: string,
    daysAhead: number = 7
  ): Promise<ScheduleSlot[]> {
    const userSlots = this.slots.get(userId) ?? [];
    const now = new Date();
    const cutoff = addDays(now, daysAhead);

    return userSlots
      .filter((slot) => {
        const slotDate = parseISO(slot.date);
        return (
          isAfter(slotDate, now) || isSameDay(slotDate, now)
        ) && isBefore(slotDate, cutoff);
      })
      .sort((a, b) => {
        const dateComp =
          parseISO(a.date).getTime() - parseISO(b.date).getTime();
        if (dateComp !== 0) return dateComp;
        return a.startTime.localeCompare(b.startTime);
      });
  }

  async detectConflicts(
    userId: string,
    newSlot: ScheduleSlotInput
  ): Promise<ScheduleConflict[]> {
    const userSlots = this.slots.get(userId) ?? [];
    const conflicts: ScheduleConflict[] = [];

    const newStart = newSlot.startTime.split(":").map(Number);
    const newEnd = newSlot.endTime.split(":").map(Number);
    const newStartMin = newStart[0] * 60 + newStart[1];
    const newEndMin = newEnd[0] * 60 + newEnd[1];

    for (const existing of userSlots) {
      if (
        format(parseISO(existing.date), "yyyy-MM-dd") !==
        format(parseISO(newSlot.date), "yyyy-MM-dd")
      ) {
        continue;
      }

      const existStart = existing.startTime.split(":").map(Number);
      const existEnd = existing.endTime.split(":").map(Number);
      const existStartMin = existStart[0] * 60 + existStart[1];
      const existEndMin = existEnd[0] * 60 + existEnd[1];

      const overlapStart = Math.max(newStartMin, existStartMin);
      const overlapEnd = Math.min(newEndMin, existEndMin);

      if (overlapStart < overlapEnd) {
        const overlapMinutes = overlapEnd - overlapStart;
        conflicts.push({
          slot1Id: existing.id,
          slot2Id: "new",
          slot1Title: existing.title,
          slot2Title: newSlot.title,
          overlapMinutes,
          suggestedResolution: `Move "${newSlot.title}" to ${format(
            addDays(parseISO(newSlot.date), 1),
            "yyyy-MM-dd"
          )} or adjust times`,
        });
      }
    }

    return conflicts;
  }

  async completeSlot(
    slotId: string,
    userId: string
  ): Promise<ScheduleSlot | null> {
    const userSlots = this.slots.get(userId) ?? [];
    const slot = userSlots.find((s) => s.id === slotId);
    if (!slot) return null;

    slot.isCompleted = true;
    slot.completedAt = new Date().toISOString();
    slot.updatedAt = new Date().toISOString();

    const completed = this.completedSlots.get(userId) ?? new Set();
    completed.add(slotId);
    this.completedSlots.set(userId, completed);

    return slot;
  }

  async getCalendarEvents(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<CalendarEvent[]> {
    const userSlots = this.slots.get(userId) ?? [];
    const events: CalendarEvent[] = [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const days = eachDayOfInterval({ start, end });

    for (const day of days) {
      const dayStr = format(day, "yyyy-MM-dd");
      const daySlots = userSlots.filter(
        (slot) =>
          format(parseISO(slot.date), "yyyy-MM-dd") === dayStr
      );

      for (const slot of daySlots) {
        const config = SLOT_TYPE_CONFIG[slot.type];
        const [startH, startM] = slot.startTime.split(":").map(Number);
        const [endH, endM] = slot.endTime.split(":").map(Number);

        events.push({
          id: slot.id,
          title: slot.title,
          start: setMinutes(setHours(day, startH), startM).toISOString(),
          end: setMinutes(setHours(day, endH), endM).toISOString(),
          type: slot.type,
          color: config.color,
          metadata: slot.metadata,
        });
      }
    }

    return events;
  }

  async createReminder(input: CreateReminderInput): Promise<ScheduleReminder> {
    const validated = createReminderSchema.parse(input);
    const now = new Date().toISOString();

    const reminder: ScheduleReminder = {
      id: crypto.randomUUID(),
      userId: validated.userId,
      type: validated.type,
      title: validated.title,
      message: validated.message ?? null,
      scheduledTime: validated.scheduledTime,
      isRecurring: validated.isRecurring,
      recurringDays: validated.recurringDays ?? [],
      recurringTime: validated.recurringTime ?? null,
      enabled: validated.enabled,
      advanceMinutes: validated.advanceMinutes,
      lastTriggered: null,
      metadata: validated.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    const userReminders = this.reminders.get(validated.userId) ?? [];
    userReminders.push(reminder);
    this.reminders.set(validated.userId, userReminders);

    return reminder;
  }

  async getReminders(
    userId: string,
    options?: { enabled?: boolean; type?: ReminderType }
  ): Promise<ScheduleReminder[]> {
    let reminders = this.reminders.get(userId) ?? [];

    if (options?.enabled !== undefined) {
      reminders = reminders.filter((r) => r.enabled === options.enabled);
    }
    if (options?.type) {
      reminders = reminders.filter((r) => r.type === options.type);
    }

    return reminders;
  }

  async updateReminder(
    reminderId: string,
    userId: string,
    updates: Partial<CreateReminderInput>
  ): Promise<ScheduleReminder | null> {
    const userReminders = this.reminders.get(userId) ?? [];
    const reminder = userReminders.find((r) => r.id === reminderId);
    if (!reminder) return null;

    if (updates.title !== undefined) reminder.title = updates.title;
    if (updates.message !== undefined) reminder.message = updates.message;
    if (updates.enabled !== undefined) reminder.enabled = updates.enabled;
    if (updates.scheduledTime !== undefined) reminder.scheduledTime = updates.scheduledTime;
    if (updates.advanceMinutes !== undefined) reminder.advanceMinutes = updates.advanceMinutes;

    reminder.updatedAt = new Date().toISOString();
    return reminder;
  }

  async deleteReminder(
    reminderId: string,
    userId: string
  ): Promise<boolean> {
    const userReminders = this.reminders.get(userId) ?? [];
    const index = userReminders.findIndex((r) => r.id === reminderId);
    if (index === -1) return false;

    userReminders.splice(index, 1);
    return true;
  }

  async getDueReminders(): Promise<ScheduleReminder[]> {
    const now = new Date();
    const dueReminders: ScheduleReminder[] = [];

    for (const [, userReminders] of this.reminders) {
      for (const reminder of userReminders) {
        if (!reminder.enabled) continue;

        const scheduledTime = parseISO(reminder.scheduledTime);
        const advanceTime = addDays(
          scheduledTime,
          -Math.floor(reminder.advanceMinutes / (24 * 60))
        );

        if (isAfter(now, scheduledTime)) {
          if (reminder.isRecurring && reminder.recurringTime) {
            const currentDay = getDay(now);
            if (reminder.recurringDays.includes(currentDay)) {
              dueReminders.push(reminder);
            }
          } else if (
            !reminder.lastTriggered ||
            !isSameDay(parseISO(reminder.lastTriggered), now)
          ) {
            dueReminders.push(reminder);
          }
        }
      }
    }

    return dueReminders;
  }

  async markReminderTriggered(
    reminderId: string,
    userId: string
  ): Promise<void> {
    const userReminders = this.reminders.get(userId) ?? [];
    const reminder = userReminders.find((r) => r.id === reminderId);
    if (reminder) {
      reminder.lastTriggered = new Date().toISOString();
      reminder.updatedAt = new Date().toISOString();
    }
  }

  async optimizeRestDays(
    userId: string,
    weekStart: string
  ): Promise<{
    suggestedSchedule: Array<{
      date: string;
      type: "workout" | "rest" | "active_recovery";
      reason: string;
    }>;
    currentRestDays: number;
    suggestedRestDays: number;
  }> {
    const start = startOfWeek(parseISO(weekStart));
    const end = endOfWeek(start);
    const days = eachDayOfInterval({ start, end });
    const userSlots = this.slots.get(userId) ?? [];

    const workoutDays: string[] = [];
    const restDays: string[] = [];

    for (const day of days) {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayHasWorkout = userSlots.some(
        (s) =>
          format(parseISO(s.date), "yyyy-MM-dd") === dayStr &&
          s.type === ScheduleSlotType.WORKOUT
      );

      if (dayHasWorkout) {
        workoutDays.push(dayStr);
      } else {
        restDays.push(dayStr);
      }
    }

    const suggestedSchedule = days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const isWorkoutDay = workoutDays.includes(dayStr);
      const dayOfWeek = getDay(day);

      if (isWorkoutDay) {
        return {
          date: dayStr,
          type: "workout" as const,
          reason: "Scheduled workout",
        };
      }

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return {
          date: dayStr,
          type: "rest" as const,
          reason: "Weekend rest day",
        };
      }

      if (dayOfWeek === 3) {
        return {
          date: dayStr,
          type: "active_recovery" as const,
          reason: "Mid-week active recovery",
        };
      }

      return {
        date: dayStr,
        type: "rest" as const,
        reason: "Recovery day",
      };
    });

    return {
      suggestedSchedule,
      currentRestDays: restDays.length,
      suggestedRestDays: suggestedSchedule.filter(
        (s) => s.type === "rest"
      ).length,
    };
  }

  async getScheduleStats(userId: string): Promise<ScheduleStats> {
    const userSlots = this.slots.get(userId) ?? [];
    const completed = this.completedSlots.get(userId) ?? new Set();

    const totalSlots = userSlots.length;
    const completedSlots = userSlots.filter((s) => s.completedAt).length;

    const adherenceRate =
      totalSlots > 0
        ? Math.round((completedSlots / totalSlots) * 100 * 100) / 100
        : 0;

    const workoutSlots = userSlots.filter(
      (s) => s.type === ScheduleSlotType.WORKOUT
    );
    const averageWorkoutDuration =
      workoutSlots.length > 0
        ? Math.round(
            workoutSlots.reduce((sum, s) => sum + s.duration, 0) /
              workoutSlots.length
          )
        : 0;

    const timeFrequency: Map<string, number> = new Map();
    for (const slot of workoutSlots) {
      const hour = slot.startTime.split(":")[0];
      timeFrequency.set(hour, (timeFrequency.get(hour) ?? 0) + 1);
    }

    let mostCommonHour = "07";
    let maxFreq = 0;
    for (const [hour, freq] of timeFrequency) {
      if (freq > maxFreq) {
        maxFreq = freq;
        mostCommonHour = hour;
      }
    }
    const mostCommonWorkoutTime = `${mostCommonHour}:00`;

    const restSlots = userSlots.filter(
      (s) => s.type === ScheduleSlotType.REST
    );
    const restDayAdherence = restSlots.length;

    const weeklyFrequency = Math.round(workoutSlots.length / 4 * 100) / 100;

    const consistency = this.calculateScheduleConsistency(userSlots);

    return {
      totalSlots,
      completedSlots,
      adherenceRate,
      averageWorkoutDuration,
      mostCommonWorkoutTime,
      restDayAdherence,
      weeklyWorkoutFrequency: weeklyFrequency,
      scheduleConsistency: consistency,
    };
  }

  async exportToCalendarFormat(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<string> {
    const events = await this.getCalendarEvents(userId, startDate, endDate);

    let ical = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//AI Fitness Platform//EN\n";

    for (const event of events) {
      const start = format(parseISO(event.start), "yyyyMMdd'T'HHmmss");
      const end = format(parseISO(event.end), "yyyyMMdd'T'HHmmss");

      ical += "BEGIN:VEVENT\n";
      ical += `DTSTART:${start}\n`;
      ical += `DTEND:${end}\n`;
      ical += `SUMMARY:${event.title}\n`;
      ical += `DESCRIPTION:${JSON.stringify(event.metadata)}\n`;
      ical += `UID:${event.id}@ai-fitness-platform\n`;
      ical += "END:VEVENT\n";
    }

    ical += "END:VCALENDAR";
    return ical;
  }

  private calculateScheduleConsistency(slots: ScheduleSlot[]): number {
    if (slots.length < 7) return 0;

    const weekFrequency: Map<number, number> = new Map();

    for (const slot of slots) {
      const weekNumber = Math.floor(
        differenceInDays(parseISO(slot.date), parseISO(slots[0].date)) / 7
      );
      weekFrequency.set(
        weekNumber,
        (weekFrequency.get(weekNumber) ?? 0) + 1
      );
    );

    const frequencies = Array.from(weekFrequency.values());
    if (frequencies.length === 0) return 0;

    const avg = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
    const variance =
      frequencies.reduce((sum, f) => sum + Math.pow(f - avg, 2), 0) /
      frequencies.length;
    const stdDev = Math.sqrt(variance);

    const consistency = Math.max(0, 100 - stdDev * 10);
    return Math.round(consistency * 100) / 100;
  }
}

export const scheduleService = new ScheduleService();
