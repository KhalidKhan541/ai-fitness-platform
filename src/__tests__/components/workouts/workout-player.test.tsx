import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkoutPlayer } from "@/components/workouts/workout-player";

const mockWorkout = {
  id: "workout-1",
  name: "Morning Strength",
  type: "STRENGTH",
  duration: 45,
  exercises: [
    {
      id: "we-1",
      exerciseId: "ex-1",
      exercise: { name: "Bench Press", muscleGroup: "CHEST", equipment: "Barbell" },
      sets: 3,
      reps: 10,
      weight: 50,
      restSeconds: 60,
      order: 1,
    },
    {
      id: "we-2",
      exerciseId: "ex-2",
      exercise: { name: "Squats", muscleGroup: "LEGS", equipment: "Barbell" },
      sets: 4,
      reps: 8,
      weight: 80,
      restSeconds: 90,
      order: 2,
    },
  ],
  warmup: [
    { name: "Jumping Jacks", duration: 60 },
    { name: "Arm Circles", duration: 30 },
  ],
  cooldown: [
    { name: "Hamstring Stretch", duration: 60 },
  ],
};

describe("WorkoutPlayer", () => {
  const defaultProps = {
    workout: mockWorkout,
    onComplete: jest.fn(),
    onPause: jest.fn(),
    onResume: jest.fn(),
    onSkipExercise: jest.fn(),
    onLogSet: jest.fn(),
    onTimerToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders workout name", () => {
    render(<WorkoutPlayer {...defaultProps} />);
    expect(screen.getByText("Morning Strength")).toBeInTheDocument();
  });

  it("shows warmup phase first", () => {
    render(<WorkoutPlayer {...defaultProps} />);
    expect(screen.getByText("Warm Up")).toBeInTheDocument();
    expect(screen.getByText("Jumping Jacks")).toBeInTheDocument();
  });

  it("transitions from warmup to first exercise", async () => {
    render(<WorkoutPlayer {...defaultProps} />);
    fireEvent.click(screen.getByText("Skip Warm Up"));

    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("Set 1 of 3")).toBeInTheDocument();
  });

  it("displays exercise details", () => {
    render(<WorkoutPlayer {...defaultProps} />);
    fireEvent.click(screen.getByText("Skip Warm Up"));

    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("3 sets x 10 reps")).toBeInTheDocument();
    expect(screen.getByText("50 kg")).toBeInTheDocument();
    expect(screen.getByText("CHEST")).toBeInTheDocument();
    expect(screen.getByText("Barbell")).toBeInTheDocument();
  });

  it("shows rest timer after completing a set", async () => {
    render(<WorkoutPlayer {...defaultProps} />);
    fireEvent.click(screen.getByText("Skip Warm Up"));
    fireEvent.click(screen.getByText("Complete Set"));

    expect(screen.getByText("Rest")).toBeInTheDocument();
    expect(screen.getByText("1:00")).toBeInTheDocument();
  });

  it("counts down rest timer", async () => {
    render(<WorkoutPlayer {...defaultProps} />);
    fireEvent.click(screen.getByText("Skip Warm Up"));
    fireEvent.click(screen.getByText("Complete Set"));

    jest.advanceTimersByTime(5000);

    expect(screen.getByText("0:55")).toBeInTheDocument();
  });

  it("skips rest timer", async () => {
    render(<WorkoutPlayer {...defaultProps} />);
    fireEvent.click(screen.getByText("Skip Warm Up"));
    fireEvent.click(screen.getByText("Complete Set"));
    fireEvent.click(screen.getByText("Skip Rest"));

    expect(screen.getByText("Set 2 of 3")).toBeInTheDocument();
  });

  it("advances to next set", () => {
    render(<WorkoutPlayer {...defaultProps} />);
    fireEvent.click(screen.getByText("Skip Warm Up"));

    fireEvent.click(screen.getByText("Complete Set"));

    expect(screen.getByText("Set 2 of 3")).toBeInTheDocument();
  });

  it("advances to next exercise after all sets", () => {
    render(<WorkoutPlayer {...defaultProps} />);
    fireEvent.click(screen.getByText("Skip Warm Up"));

    // Complete all 3 sets of exercise 1
    fireEvent.click(screen.getByText("Complete Set"));
    fireEvent.click(screen.getByText("Skip Rest"));
    fireEvent.click(screen.getByText("Complete Set"));
    fireEvent.click(screen.getByText("Skip Rest"));
    fireEvent.click(screen.getByText("Complete Set"));

    expect(screen.getByText("Squats")).toBeInTheDocument();
    expect(screen.getByText("Set 1 of 4")).toBeInTheDocument();
  });

  it("shows cooldown after all exercises", () => {
    render(<WorkoutPlayer {...defaultProps} />);
    fireEvent.click(screen.getByText("Skip Warm Up"));

    // Complete exercise 1
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText("Complete Set"));
      if (i < 2) fireEvent.click(screen.getByText("Skip Rest"));
    }

    // Complete exercise 2
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByText("Complete Set"));
      if (i < 3) fireEvent.click(screen.getByText("Skip Rest"));
    }

    expect(screen.getByText("Cool Down")).toBeInTheDocument();
  });

  it("shows completion screen after cooldown", () => {
    render(<WorkoutPlayer {...defaultProps} />);
    fireEvent.click(screen.getByText("Skip Warm Up"));

    // Complete all exercises
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText("Complete Set"));
      if (i < 2) fireEvent.click(screen.getByText("Skip Rest"));
    }

    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByText("Complete Set"));
      if (i < 3) fireEvent.click(screen.getByText("Skip Rest"));
    }

    fireEvent.click(screen.getByText("Complete Cool Down"));

    expect(screen.getByText("Workout Complete!")).toBeInTheDocument();
    expect(defaultProps.onComplete).toHaveBeenCalled();
  });

  it("shows pause button", () => {
    render(<WorkoutPlayer {...defaultProps} />);
    expect(screen.getByLabelText("Pause workout")).toBeInTheDocument();
  });

  it("toggles pause/resume", () => {
    render(<WorkoutPlayer {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Pause workout"));

    expect(screen.getByLabelText("Resume workout")).toBeInTheDocument();
    expect(defaultProps.onPause).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Resume workout"));
    expect(defaultProps.onResume).toHaveBeenCalled();
  });

  it("shows progress indicator", () => {
    render(<WorkoutPlayer {...defaultProps} />);
    expect(screen.getByText("Exercise 1 of 2")).toBeInTheDocument();
  });

  it("tracks elapsed time", () => {
    render(<WorkoutPlayer {...defaultProps} />);
    fireEvent.click(screen.getByText("Skip Warm Up"));

    jest.advanceTimersByTime(60000);

    expect(screen.getByText("1:00")).toBeInTheDocument();
  });

  it("shows weight adjustment controls", () => {
    render(<WorkoutPlayer {...defaultProps} />);
    fireEvent.click(screen.getByText("Skip Warm Up"));

    expect(screen.getByLabelText("Decrease weight")).toBeInTheDocument();
    expect(screen.getByLabelText("Increase weight")).toBeInTheDocument();
  });

  it("allows weight adjustment", () => {
    render(<WorkoutPlayer {...defaultProps} />);
    fireEvent.click(screen.getByText("Skip Warm Up"));

    fireEvent.click(screen.getByLabelText("Increase weight"));
    fireEvent.click(screen.getByLabelText("Increase weight"));

    expect(screen.getByText("55 kg")).toBeInTheDocument();
  });

  it("shows notes input for exercise", () => {
    render(<WorkoutPlayer {...defaultProps} />);
    fireEvent.click(screen.getByText("Skip Warm Up"));

    expect(screen.getByPlaceholderText("Add notes...")).toBeInTheDocument();
  });

  it("shows exit confirmation dialog", () => {
    render(<WorkoutPlayer {...defaultProps} />);
    fireEvent.click(screen.getByText("Exit"));

    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(
      screen.getByText("Your progress will be lost.")
    ).toBeInTheDocument();
  });

  it("calls onSkipExercise when skip button is clicked", () => {
    render(<WorkoutPlayer {...defaultProps} />);
    fireEvent.click(screen.getByText("Skip Warm Up"));
    fireEvent.click(screen.getByText("Skip Exercise"));

    expect(defaultProps.onSkipExercise).toHaveBeenCalledWith("ex-1");
  });

  it("shows heart rate display when available", () => {
    render(<WorkoutPlayer {...defaultProps} heartRate={145} />);
    fireEvent.click(screen.getByText("Skip Warm Up"));

    expect(screen.getByText("145 BPM")).toBeInTheDocument();
  });

  it("shows calorie counter", () => {
    render(<WorkoutPlayer {...defaultProps} />);
    fireEvent.click(screen.getByText("Skip Warm Up"));

    expect(screen.getByText(/calories/i)).toBeInTheDocument();
  });

  it("renders loading state", () => {
    render(<WorkoutPlayer {...defaultProps} isLoading />);
    expect(screen.getByTestId("player-skeleton")).toBeInTheDocument();
  });
});
