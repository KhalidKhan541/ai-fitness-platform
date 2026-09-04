import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MealTracker } from "@/components/nutrition/meal-tracker";

const mockMeals = [
  {
    id: "meal-1",
    mealType: "BREAKFAST",
    food: { name: "Oatmeal with Berries" },
    quantity: 100,
    unit: "g",
    calories: 350,
    protein: 12,
    carbs: 60,
    fat: 8,
    loggedAt: new Date("2024-01-15T08:00:00Z"),
  },
  {
    id: "meal-2",
    mealType: "LUNCH",
    food: { name: "Grilled Chicken Salad" },
    quantity: 250,
    unit: "g",
    calories: 450,
    protein: 40,
    carbs: 20,
    fat: 22,
    loggedAt: new Date("2024-01-15T12:30:00Z"),
  },
  {
    id: "meal-3",
    mealType: "DINNER",
    food: { name: "Salmon with Rice" },
    quantity: 300,
    unit: "g",
    calories: 600,
    protein: 45,
    carbs: 55,
    fat: 20,
    loggedAt: new Date("2024-01-15T19:00:00Z"),
  },
];

describe("MealTracker", () => {
  const defaultProps = {
    meals: mockMeals,
    dailyGoal: {
      calories: 2200,
      protein: 150,
      carbs: 220,
      fat: 73,
    },
    onAddMeal: jest.fn(),
    onRemoveMeal: jest.fn(),
    onEditMeal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders daily calorie total", () => {
    render(<MealTracker {...defaultProps} />);
    expect(screen.getByText("1400")).toBeInTheDocument();
    expect(screen.getByText("/ 2200 cal")).toBeInTheDocument();
  });

  it("renders macro totals", () => {
    render(<MealTracker {...defaultProps} />);
    expect(screen.getByText("97g")).toBeInTheDocument(); // protein
    expect(screen.getByText("135g")).toBeInTheDocument(); // carbs
    expect(screen.getByText("50g")).toBeInTheDocument(); // fat
  });

  it("displays progress bars for each macro", () => {
    render(<MealTracker {...defaultProps} />);
    expect(screen.getByTestId("protein-progress")).toBeInTheDocument();
    expect(screen.getByTestId("carbs-progress")).toBeInTheDocument();
    expect(screen.getByTestId("fat-progress")).toBeInTheDocument();
    expect(screen.getByTestId("calories-progress")).toBeInTheDocument();
  });

  it("groups meals by type", () => {
    render(<MealTracker {...defaultProps} />);
    expect(screen.getByText("Breakfast")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(screen.getByText("Dinner")).toBeInTheDocument();
  });

  it("displays individual meal items", () => {
    render(<MealTracker {...defaultProps} />);
    expect(screen.getByText("Oatmeal with Berries")).toBeInTheDocument();
    expect(screen.getByText("Grilled Chicken Salad")).toBeInTheDocument();
    expect(screen.getByText("Salmon with Rice")).toBeInTheDocument();
  });

  it("shows calorie count per meal", () => {
    render(<MealTracker {...defaultProps} />);
    expect(screen.getByText("350 cal")).toBeInTheDocument();
    expect(screen.getByText("450 cal")).toBeInTheDocument();
    expect(screen.getByText("600 cal")).toBeInTheDocument();
  });

  it("calls onAddMeal when add button is clicked", () => {
    render(<MealTracker {...defaultProps} />);
    fireEvent.click(screen.getByText("Add Meal"));
    expect(defaultProps.onAddMeal).toHaveBeenCalled();
  });

  it("calls onRemoveMeal when remove button is clicked", () => {
    render(<MealTracker {...defaultProps} />);
    const removeButtons = screen.getAllByLabelText("Remove meal");
    fireEvent.click(removeButtons[0]);
    expect(defaultProps.onRemoveMeal).toHaveBeenCalledWith("meal-1");
  });

  it("shows remaining calories", () => {
    render(<MealTracker {...defaultProps} />);
    expect(screen.getByText("800")).toBeInTheDocument();
    expect(screen.getByText("remaining")).toBeInTheDocument();
  });

  it("shows over-limit warning when exceeded", () => {
    const overLimitMeals = [
      ...mockMeals,
      {
        id: "meal-4",
        mealType: "SNACK",
        food: { name: "Pizza" },
        quantity: 1,
        unit: "slice",
        calories: 900,
        protein: 30,
        carbs: 100,
        fat: 35,
        loggedAt: new Date(),
      },
    ];

    render(<MealTracker {...defaultProps} meals={overLimitMeals} />);
    expect(screen.getByText("Over goal")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<MealTracker {...defaultProps} meals={[]} />);
    expect(screen.getByText("No meals logged today")).toBeInTheDocument();
    expect(screen.getByText("Start tracking your nutrition")).toBeInTheDocument();
  });

  it("shows meal time", () => {
    render(<MealTracker {...defaultProps} />);
    expect(screen.getByText("8:00 AM")).toBeInTheDocument();
    expect(screen.getByText("12:30 PM")).toBeInTheDocument();
    expect(screen.getByText("7:00 PM")).toBeInTheDocument();
  });

  it("displays macro breakdown per meal", () => {
    render(<MealTracker {...defaultProps} />);
    expect(screen.getByText("12g protein")).toBeInTheDocument();
    expect(screen.getByText("60g carbs")).toBeInTheDocument();
    expect(screen.getByText("8g fat")).toBeInTheDocument();
  });

  it("shows circular progress for calories", () => {
    render(<MealTracker {...defaultProps} />);
    expect(screen.getByTestId("circular-progress")).toBeInTheDocument();
  });

  it("renders with different date", () => {
    render(
      <MealTracker
        {...defaultProps}
        date={new Date("2024-01-20")}
      />
    );
    expect(screen.getByText("Sat, Jan 20")).toBeInTheDocument();
  });

  it("allows navigating between dates", () => {
    render(<MealTracker {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Previous day"));
    expect(screen.getByText("Sun, Jan 14")).toBeInTheDocument();
  });

  it("shows quick add for common foods", () => {
    render(<MealTracker {...defaultProps} showQuickAdd />);
    expect(screen.getByText("Quick Add")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <MealTracker {...defaultProps} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("shows loading state", () => {
    render(<MealTracker {...defaultProps} isLoading />);
    expect(screen.getByTestId("tracker-skeleton")).toBeInTheDocument();
  });

  it("displays water intake tracker", () => {
    render(<MealTracker {...defaultProps} showWaterTracker />);
    expect(screen.getByText("Water Intake")).toBeInTheDocument();
    expect(screen.getByText("0 / 8 glasses")).toBeInTheDocument();
  });

  it("increments water intake", () => {
    render(<MealTracker {...defaultProps} showWaterTracker />);
    fireEvent.click(screen.getByText("+"));
    expect(screen.getByText("1 / 8 glasses")).toBeInTheDocument();
  });
});
