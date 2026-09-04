import { useCallback, useEffect, useRef } from "react";
import { useWorkoutStore } from "@/store/workout-store";

export function useWorkoutTimer() {
  const {
    isWorkoutActive,
    isPaused,
    elapsedSeconds,
    incrementTimer,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    endWorkout,
    cancelWorkout,
  } = useWorkoutStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isWorkoutActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        incrementTimer();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isWorkoutActive, isPaused, incrementTimer]);

  const formattedTime = useCallback(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const secs = elapsedSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [elapsedSeconds]);

  const minutes = Math.floor(elapsedSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const displayMinutes = minutes % 60;

  return {
    isActive: isWorkoutActive,
    isPaused,
    elapsedSeconds,
    hours,
    minutes: displayMinutes,
    seconds: elapsedSeconds % 60,
    formattedTime: formattedTime(),
    start: startWorkout,
    pause: pauseWorkout,
    resume: resumeWorkout,
    end: endWorkout,
    cancel: cancelWorkout,
  };
}

export function useRestTimer() {
  const { restTimer, startRestTimer, stopRestTimer, tickRestTimer } =
    useWorkoutStore();

  useEffect(() => {
    if (restTimer?.isRunning && restTimer.remaining > 0) {
      const interval = setInterval(() => {
        tickRestTimer();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [restTimer?.isRunning, restTimer?.remaining, tickRestTimer]);

  const formattedTime = useCallback(() => {
    if (!restTimer) return "0:00";
    const minutes = Math.floor(restTimer.remaining / 60);
    const secs = restTimer.remaining % 60;
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  }, [restTimer]);

  return {
    isActive: restTimer?.isRunning ?? false,
    remaining: restTimer?.remaining ?? 0,
    duration: restTimer?.duration ?? 0,
    progress:
      restTimer && restTimer.duration > 0
        ? ((restTimer.duration - restTimer.remaining) / restTimer.duration) * 100
        : 0,
    formattedTime: formattedTime(),
    start: startRestTimer,
    stop: stopRestTimer,
    tick: tickRestTimer,
  };
}
