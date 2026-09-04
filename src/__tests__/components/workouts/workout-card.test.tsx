import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkoutCard } from "@/components/workouts/workout-card";

const mockWorkout = {
  id: "workout-1",
  name: "Morning Strength Training",
  type: "STRENGTH",
  difficulty: "INTERMEDIATE",
  duration: 45,
  caloriesBurned: 350,
  isCompleted: false,
  isPublic: true,
  exerciseCount: 6,
  muscleGroups: ["Chest", "Back", "Legs"],
  createdAt: new Date("2024-01-15"),
  author: { name: "Alice Johnson", image: null },
};

const mockCompletedWorkout = {
  ...mockWorkout,
  id: "workout-2",
  isCompleted: true,
  completedAt: new Date("2024-01-15T10:00:00Z"),
  userRating: 8,
};

describe("WorkoutCard", () => {
  const defaultProps = {
    workout: mockWorkout,
    onStart: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onShare: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders workout name", () => {
    render(<WorkoutCard {...defaultProps} />);
    expect(screen.getByText("Morning Strength Training")).toBeInTheDocument();
  });

  it("renders workout type badge", () => {
    render(<WorkoutCard {...defaultProps} />);
    expect(screen.getByText("STRENGTH")).toBeInTheDocument();
  });

  it("renders difficulty level", () => {
    render(<WorkoutCard {...defaultProps} />);
    expect(screen.getByText("INTERMEDIATE")).toBeInTheDocument();
  });

  it("displays duration correctly", () => {
    render(<WorkoutCard {...defaultProps} />);
    expect(screen.getByText("45 min")).toBeInTheDocument();
  });

  it("displays calories burned", () => {
    render(<WorkoutCard {...defaultProps} />);
    expect(screen.getByText("350 cal")).toBeInTheDocument();
  });

  it("displays exercise count", () => {
    render(<WorkoutCard {...defaultProps} />);
    expect(screen.getByText("6 exercises")).toBeInTheDocument();
  });

  it("displays muscle groups as tags", () => {
    render(<WorkoutCard {...defaultProps} />);
    expect(screen.getByText("Chest")).toBeInTheDocument();
    expect(screen.getByText("Back")).toBeInTheDocument();
    expect(screen.getByText("Legs")).toBeInTheDocument();
  });

  it("calls onStart when start button is clicked", () => {
    render(<WorkoutCard {...defaultProps} />);
    fireEvent.click(screen.getByText("Start Workout"));
    expect(defaultProps.onStart).toHaveBeenCalledWith("workout-1");
  });

  it("shows completed state", () => {
    render(<WorkoutCard {...defaultProps} workout={mockCompletedWorkout} />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.queryByText("Start Workout")).not.toBeInTheDocument();
  });

  it("shows user rating when completed", () => {
    render(<WorkoutCard {...defaultProps} workout={mockCompletedWorkout} />);
    expect(screen.getByText("8/10")).toBeInTheDocument();
  });

  it("renders author info", () => {
    render(<WorkoutCard {...defaultProps} />);
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
  });

  it("shows public badge", () => {
    render(<WorkoutCard {...defaultProps} />);
    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("hides public badge when private", () => {
    render(
      <WorkoutCard
        {...defaultProps}
        workout={{ ...mockWorkout, isPublic: false }}
      />
    );
    expect(screen.queryByText("Public")).not.toBeInTheDocument();
  });

  it("displays created date", () => {
    render(<WorkoutCard {...defaultProps} />);
    expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", () => {
    render(<WorkoutCard {...defaultProps} showActions />);
    fireEvent.click(screen.getByLabelText("Edit workout"));
    expect(defaultProps.onEdit).toHaveBeenCalledWith("workout-1");
  });

  it("calls onDelete when delete button is clicked", () => {
    render(<WorkoutCard {...defaultProps} showActions />);
    fireEvent.click(screen.getByLabelText("Delete workout"));
    expect(defaultProps.onDelete).toHaveBeenCalledWith("workout-1");
  });

  it("calls onShare when share button is clicked", () => {
    render(<WorkoutCard {...defaultProps} showActions />);
    fireEvent.click(screen.getByLabelText("Share workout"));
    expect(defaultProps.onShare).toHaveBeenCalledWith("workout-1");
  });

  it("does not show action buttons when showActions is false", () => {
    render(<WorkoutCard {...defaultProps} showActions={false} />);
    expect(screen.queryByLabelText("Edit workout")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Delete workout")).not.toBeInTheDocument();
  });

  it("renders with loading state", () => {
    render(<WorkoutCard {...defaultProps} isLoading />);
    expect(screen.getByTestId("workout-card-skeleton")).toBeInTheDocument();
  });

  it("renders image when provided", () => {
    render(
      <WorkoutCard
        {...defaultProps}
        workout={{
          ...mockWorkout,
          imageUrl: "/images/workout.jpg",
        }}
      />
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/images/workout.jpg");
  });

  it("applies custom className", () => {
    const { container } = render(
      <WorkoutCard {...defaultProps} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("renders difficulty with correct color", () => {
    const { rerender } = render(<WorkoutCard {...defaultProps} />);
    expect(screen.getByText("INTERMEDIATE")).toHaveClass("bg-yellow-100");

    rerender(
      <WorkoutCard
        {...defaultProps}
        workout={{ ...mockWorkout, difficulty: "BEGINNER" }}
      />
    );
    expect(screen.getByText("BEGINNER")).toHaveClass("bg-green-100");

    rerender(
      <WorkoutCard
        {...defaultProps}
        workout={{ ...mockWorkout, difficulty: "ADVANCED" }}
      />
    );
    expect(screen.getByText("ADVANCED")).toHaveClass("bg-red-100");
  });

  it("handles missing author gracefully", () => {
    render(
      <WorkoutCard
        {...defaultProps}
        workout={{ ...mockWorkout, author: null }}
      />
    );
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("renders compact variant", () => {
    render(<WorkoutCard {...defaultProps} variant="compact" />);
    expect(screen.getByText("Morning Strength Training")).toBeInTheDocument();
    expect(screen.queryByText("6 exercises")).not.toBeInTheDocument();
  });
});
