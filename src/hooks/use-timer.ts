import * as React from "react";

interface UseTimerOptions {
  initialTime?: number;
  interval?: number;
  onTimeUpdate?: (time: number) => void;
  onTimerComplete?: () => void;
}

interface UseTimerResult {
  time: number;
  isRunning: boolean;
  isPaused: boolean;
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  formattedTime: string;
  progress: number;
}

function useTimer(options: UseTimerOptions = {}): UseTimerResult {
  const { initialTime = 0, interval = 1000, onTimeUpdate, onTimerComplete } = options;

  const [time, setTime] = React.useState(initialTime);
  const [isRunning, setIsRunning] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const clearTimer = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = React.useCallback(() => {
    clearTimer();
    setIsRunning(true);
    setIsPaused(false);
    intervalRef.current = setInterval(() => {
      setTime((prev) => {
        const newTime = prev + 1;
        onTimeUpdate?.(newTime);
        return newTime;
      });
    }, interval);
  }, [clearTimer, interval, onTimeUpdate]);

  const stop = React.useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
  }, [clearTimer]);

  const pause = React.useCallback(() => {
    clearTimer();
    setIsPaused(true);
  }, [clearTimer]);

  const resume = React.useCallback(() => {
    if (isPaused && isRunning) {
      setIsPaused(false);
      intervalRef.current = setInterval(() => {
        setTime((prev) => {
          const newTime = prev + 1;
          onTimeUpdate?.(newTime);
          return newTime;
        });
      }, interval);
    }
  }, [isPaused, isRunning, interval, onTimeUpdate]);

  const reset = React.useCallback(() => {
    clearTimer();
    setTime(initialTime);
    setIsRunning(false);
    setIsPaused(false);
  }, [clearTimer, initialTime]);

  React.useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const formattedTime = React.useMemo(() => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [time]);

  const progress = React.useMemo(() => {
    return time > 0 ? (time / initialTime) * 100 : 0;
  }, [time, initialTime]);

  return {
    time,
    isRunning,
    isPaused,
    start,
    stop,
    pause,
    resume,
    reset,
    formattedTime,
    progress,
  };
}

function useCountdown(
  initialTime: number,
  onComplete?: () => void
): UseTimerResult & { remaining: number; percentage: number } {
  const [time, setTime] = React.useState(initialTime);
  const [isRunning, setIsRunning] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const clearTimer = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = React.useCallback(() => {
    clearTimer();
    setIsRunning(true);
    setIsPaused(false);
    intervalRef.current = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer, onComplete]);

  const stop = React.useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
  }, [clearTimer]);

  const pause = React.useCallback(() => {
    clearTimer();
    setIsPaused(true);
  }, [clearTimer]);

  const resume = React.useCallback(() => {
    if (isPaused && isRunning) {
      setIsPaused(false);
      intervalRef.current = setInterval(() => {
        setTime((prev) => {
          if (prev <= 1) {
            clearTimer();
            setIsRunning(false);
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [isPaused, isRunning, clearTimer, onComplete]);

  const reset = React.useCallback(() => {
    clearTimer();
    setTime(initialTime);
    setIsRunning(false);
    setIsPaused(false);
  }, [clearTimer, initialTime]);

  React.useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const formattedTime = React.useMemo(() => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [time]);

  const percentage = React.useMemo(() => {
    return initialTime > 0 ? ((initialTime - time) / initialTime) * 100 : 0;
  }, [time, initialTime]);

  return {
    time,
    isRunning,
    isPaused,
    start,
    stop,
    pause,
    resume,
    reset,
    formattedTime,
    progress: percentage,
    remaining: time,
    percentage,
  };
}

function useStopwatch(interval = 1000): UseTimerResult {
  return useTimer({ initialTime: 0, interval });
}

export { useTimer, useCountdown, useStopwatch };
