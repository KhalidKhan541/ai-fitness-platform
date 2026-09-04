type EventHandler = (...args: unknown[]) => void;

interface EventEntry {
  handler: EventHandler;
  once: boolean;
}

class TypedEventEmitter<Events extends Record<string, unknown[]>> {
  private events: Map<string, EventEntry[]> = new Map();

  on<K extends keyof Events & string>(
    event: K,
    handler: (...args: Events[K]) => void
  ): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push({ handler: handler as EventHandler, once: false });
    return () => this.off(event, handler);
  }

  once<K extends keyof Events & string>(
    event: K,
    handler: (...args: Events[K]) => void
  ): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push({ handler: handler as EventHandler, once: true });
    return () => this.off(event, handler);
  }

  off<K extends keyof Events & string>(
    event: K,
    handler: (...args: Events[K]) => void
  ): void {
    const entries = this.events.get(event);
    if (!entries) return;
    const filtered = entries.filter(
      (e) => e.handler !== (handler as EventHandler)
    );
    this.events.set(event, filtered);
  }

  emit<K extends keyof Events & string>(event: K, ...args: Events[K]): void {
    const entries = this.events.get(event);
    if (!entries) return;

    const toRemove: number[] = [];
    entries.forEach((entry, index) => {
      try {
        entry.handler(...args);
        if (entry.once) toRemove.push(index);
      } catch {
        // silent fail
      }
    });

    if (toRemove.length > 0) {
      for (let i = toRemove.length - 1; i >= 0; i--) {
        entries.splice(toRemove[i], 1);
      }
    }
  }

  removeAllListeners(event?: keyof Events & string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  listenerCount(event: keyof Events & string): number {
    return this.events.get(event as string)?.length || 0;
  }

  eventNames(): (keyof Events & string)[] {
    return Array.from(this.events.keys()) as (keyof Events & string)[];
  }
}

export interface FitnessEvents {
  "workout:start": [workoutId: string];
  "workout:pause": [workoutId: string];
  "workout:resume": [workoutId: string];
  "workout:complete": [workoutId: string; duration: number];
  "workout:exercise:add": [exerciseId: string];
  "workout:exercise:complete": [exerciseId: string];
  "workout:set:complete": [setIndex: number];
  "nutrition:meal:logged": [mealId: string; calories: number];
  "nutrition:water:logged": [amount: number];
  "progress:weight:logged": [weight: number; unit: string];
  "progress:photo:uploaded": [photoId: string];
  "goal:created": [goalId: string];
  "goal:achieved": [goalId: string];
  "challenge:joined": [challengeId: string];
  "challenge:completed": [challengeId: string];
  "achievement:unlocked": [achievementId: string; xp: number];
  "social:post:created": [postId: string];
  "social:like": [postId: string];
  "social:comment": [postId: string; commentId: string];
  "notification:new": [notificationId: string; type: string];
  "user:login": [userId: string];
  "user:logout": [userId: string];
  "user:profile:updated": [userId: string];
  "sync:start": [];
  "sync:complete": [itemsSynced: number];
  "sync:error": [error: string];
  "ai:recommendation": [recommendationId: string; type: string];
  "streak:updated": [days: number];
  "level:up": [newLevel: number];
}

export const appEvents = new TypedEventEmitter<FitnessEvents>();

export function createEventBus<Events extends Record<string, unknown[]>>() {
  return new TypedEventEmitter<Events>();
}

export { TypedEventEmitter };
