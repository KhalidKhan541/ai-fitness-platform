import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoalCard } from "@/components/goals/goal-card";

const mockGoal = {
  id: "goal-1",
  type: "WEIGHT_LOSS",
  title: "Lose 10kg",
  description: "Reach my target weight of 65kg",
  targetValue: 65,
  currentValue: 72,
  startValue: 80,
  unit: "kg",
  startDate: new Date("2024-01-01"),
  targetDate: new Date("2024-04-01"),
  status: "ACTIVE",
  progress: 50,
  milestones: [
    { id: "ms-1", title: "First 2kg lost", targetValue: 78, isCompleted: true },
    { id: "ms-2", title: "Halfway there", targetValue: 75, isCompleted: false },
    { id: "ms-3", title: "Almost done", targetValue: 70, isCompleted: false },
  ],
};

const mockCompletedGoal = {
  ...mockGoal,
  id: "goal-2",
  status: "COMPLETED",
  currentValue: 65,
  progress: 100,
  completedAt: new Date("2024-03-28"),
};

describe("GoalCard", () => {
  const defaultProps = {
    goal: mockGoal,
    onUpdate: jest.fn(),
    onComplete: jest.fn(),
    onArchive: jest.fn(),
    onDelete: jest.fn(),
    onViewDetails: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders goal title", () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText("Lose 10kg")).toBeInTheDocument();
  });

  it("displays goal description", () => {
    render(<GoalCard {...defaultProps} />);
    expect(
      screen.getByText("Reach my target weight of 65kg")
    ).toBeInTheDocument();
  });

  it("shows progress percentage", () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders progress bar", () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50"
    );
  });

  it("displays current vs target values", () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText("72 kg")).toBeInTheDocument();
    expect(screen.getByText("65 kg")).toBeInTheDocument();
  });

  it("shows start and target dates", () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Apr 1, 2024/)).toBeInTheDocument();
  });

  it("displays active status badge", () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows completed status", () => {
    render(<GoalCard {...defaultProps} goal={mockCompletedGoal} />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("displays completed date", () => {
    render(<GoalCard {...defaultProps} goal={mockCompletedGoal} />);
    expect(screen.getByText(/Mar 28, 2024/)).toBeInTheDocument();
  });

  it("shows milestones", () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText("First 2kg lost")).toBeInTheDocument();
    expect(screen.getByText("Halfway there")).toBeInTheDocument();
    expect(screen.getByText("Almost done")).toBeInTheDocument();
  });

  it("shows completed milestones with checkmark", () => {
    render(<GoalCard {...defaultProps} />);
    const completedMilestone = screen.getByText("First 2kg lost");
    expect(completedMilestone).toHaveClass("line-through");
  });

  it("calculates days remaining", () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText(/days remaining/)).toBeInTheDocument();
  });

  it("shows overdue warning when past target date", () => {
    const overdueGoal = {
      ...mockGoal,
      targetDate: new Date("2024-01-01"),
    };
    render(<GoalCard {...defaultProps} goal={overdueGoal} />);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("calls onViewDetails when clicked", () => {
    render(<GoalCard {...defaultProps} />);
    fireEvent.click(screen.getByText("Lose 10kg"));
    expect(defaultProps.onViewDetails).toHaveBeenCalledWith("goal-1");
  });

  it("calls onComplete when complete button is clicked", () => {
    render(<GoalCard {...defaultProps} />);
    fireEvent.click(screen.getByText("Mark Complete"));
    expect(defaultProps.onComplete).toHaveBeenCalledWith("goal-1");
  });

  it("calls onArchive when archive button is clicked", () => {
    render(<GoalCard {...defaultProps} goal={mockCompletedGoal} />);
    fireEvent.click(screen.getByText("Archive"));
    expect(defaultProps.onArchive).toHaveBeenCalledWith("goal-2");
  });

  it("calls onDelete when delete button is clicked", () => {
    render(<GoalCard {...defaultProps} showActions />);
    fireEvent.click(screen.getByLabelText("Delete goal"));
    expect(defaultProps.onDelete).toHaveBeenCalledWith("goal-1");
  });

  it("shows encouragement message for good progress", () => {
    const goodProgress = { ...mockGoal, progress: 75 };
    render(<GoalCard {...defaultProps} goal={goodProgress} />);
    expect(screen.getByText(/Great progress/)).toBeInTheDocument();
  });

  it("shows motivational message for low progress", () => {
    const lowProgress = { ...mockGoal, progress: 15 };
    render(<GoalCard {...defaultProps} goal={lowProgress} />);
    expect(screen.getByText(/Keep going/)).toBeInTheDocument();
  });

  it("renders with different goal types", () => {
    const strengthGoal = {
      ...mockGoal,
      type: "STRENGTH",
      title: "Bench Press 100kg",
      unit: "kg",
    };
    render(<GoalCard {...defaultProps} goal={strengthGoal} />);
    expect(screen.getByText("Bench Press 100kg")).toBeInTheDocument();
  });

  it("displays calorie goal type", () => {
    const calorieGoal = {
      ...mockGoal,
      type: "CALORIE_DEFICIT",
      title: "Eat 2000 cal/day",
      unit: "cal/day",
    };
    render(<GoalCard {...defaultProps} goal={calorieGoal} />);
    expect(screen.getByText("Eat 2000 cal/day")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <GoalCard {...defaultProps} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("shows loading state", () => {
    render(<GoalCard {...defaultProps} isLoading />);
    expect(screen.getByTestId("goal-card-skeleton")).toBeInTheDocument();
  });

  it("renders compact variant", () => {
    render(<GoalCard {...defaultProps} variant="compact" />);
    expect(screen.getByText("Lose 10kg")).toBeInTheDocument();
    expect(
      screen.queryByText("Reach my target weight of 65kg")
    ).not.toBeInTheDocument();
  });

  it("shows days elapsed", () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText(/days elapsed/)).toBeInTheDocument();
  });

  it("displays remaining amount", () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText("7.0 kg to go")).toBeInTheDocument();
  });

  it("shows projection based on current rate", () => {
    render(<GoalCard {...defaultProps} showProjection />);
    expect(screen.getByText(/Projected/)).toBeInTheDocument();
  });
});
