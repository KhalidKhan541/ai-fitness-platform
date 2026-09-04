import { useState, useCallback, useEffect, useRef } from "react";

type TimerMode = "stopwatch" | "countdown" | "rest";

interface UseTimerOptions {
  initialSeconds?: number;
  countdownTarget?: number;
  mode?: TimerMode;
  onComplete?: () => void;
  onTick?: (seconds: number) => void;
  autoStart?: boolean;
}

interface UseTimerResult {
  seconds: number;
  isRunning: boolean;
  isPaused: boolean;
  mode: TimerMode;
  formattedTime: string;
  progress: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  resetTo: (seconds: number) => void;
  addTime: (seconds: number) => void;
  subtractTime: (seconds: number) => void;
  setMode: (mode: TimerMode) => void;
  getLapTimes: () => number[];
  lap: () => void;
}

export function useTimer(options: UseTimerOptions = {}): UseTimerResult {
  const {
    initialSeconds = 0,
    countdownTarget,
    mode: initialMode = "stopwatch",
    onComplete,
    onTick,
    autoStart = false,
  } = options;

  const [seconds, setSeconds] = useState(
    initialMode === "countdown" && countdownTarget ? countdownTarget : initialSeconds
  );
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isPaused, setIsPaused] = useState(false);
  const [mode, setMode] = useState<TimerMode>(initialMode);
  const [laps, setLaps] = useState<number[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetRef = useRef(
    initialMode === "countdown" && countdownTarget ? countdownTarget : 0
  );

  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearTimerInterval();

    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          let next: number;

          if (mode === "countdown") {
            next = prev - 1;
            if (next <= 0) {
              clearTimerInterval();
              setIsRunning(false);
              onComplete?.();
              return 0;
            }
          } else {
            next = prev + 1;
          }

          onTick?.(next);
          return next;
        });
      }, 1000);
    }

    return clearTimerInterval;
  }, [isRunning, isPaused, mode, onComplete, onTick, clearTimerInterval]);

  const start = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    clearTimerInterval();
    setIsRunning(false);
    setIsPaused(false);
  }, [clearTimerInterval]);

  const reset = useCallback(() => {
    clearTimerInterval();
    setSeconds(
      mode === "countdown" && targetRef.current > 0 ? targetRef.current : 0
    );
    setIsRunning(false);
    setIsPaused(false);
    setLaps([]);
  }, [clearTimerInterval, mode]);

  const resetTo = useCallback(
    (newSeconds: number) => {
      clearTimerInterval();
      setSeconds(newSeconds);
      targetRef.current = newSeconds;
      setIsRunning(false);
      setIsPaused(false);
      setLaps([]);
    },
    [clearTimerInterval]
  );

  const addTime = useCallback((additionalSeconds: number) => {
    setSeconds((prev) => prev + additionalSeconds);
    targetRef.current += additionalSeconds;
  }, []);

  const subtractTime = useCallback((subtractSeconds: number) => {
    setSeconds((prev) => Math.max(0, prev - subtractSeconds));
  }, []);

  const setModeAndReset = useCallback(
    (newMode: TimerMode) => {
      clearTimerInterval();
      setMode(newMode);
      if (newMode === "countdown" && countdownTarget) {
        setSeconds(countdownTarget);
        targetRef.current = countdownTarget;
      } else {
        setSeconds(initialSeconds);
        targetRef.current = 0;
      }
      setIsRunning(false);
      setIsPaused(false);
      setLaps([]);
    },
    [clearTimerInterval, countdownTarget, initialSeconds]
  );

  const lap = useCallback(() => {
    setLaps((prev) => [...prev, seconds]);
  }, [seconds]);

  const getLapTimes = useCallback(() => {
    return laps.map((lapTime, index) => {
      const prevLap = index > 0 ? laps[index - 1] : 0;
      return lapTime - prevLap;
    });
  }, [laps]);

  const target =
    mode === "countdown" && targetRef.current > 0 ? targetRef.current : 1;
  const progress =
    mode === "countdown"
      ? target > 0
        ? ((target - seconds) / target) * 100
        : 0
      : seconds > 0
        ? Math.min(100, (seconds / 3600) * 100)
        : 0;

  const formattedTime = formatTimerTime(seconds);

  return {
    seconds,
    isRunning,
    isPaused,
    mode,
    formattedTime,
    progress: Math.round(progress * 10) / 10,
    start,
    pause,
    resume,
    stop,
    reset,
    resetTo,
    addTime,
    subtractTime,
    setMode: setModeAndReset,
    getLapTimes,
    lap,
  };
}

function formatTimerTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
