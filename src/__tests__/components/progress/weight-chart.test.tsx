import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { WeightChart } from "@/components/progress/weight-chart";

const mockData = [
  { date: new Date("2024-01-01"), value: 80 },
  { date: new Date("2024-01-08"), value: 79.5 },
  { date: new Date("2024-01-15"), value: 79 },
  { date: new Date("2024-01-22"), value: 78.5 },
  { date: new Date("2024-01-29"), value: 78 },
];

describe("WeightChart", () => {
  const defaultProps = {
    data: mockData,
    targetWeight: 75,
    unit: "kg",
    title: "Weight Progress",
    showGoalLine: true,
    showTrend: true,
    dateRange: "30d",
    onDateRangeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders chart title", () => {
    render(<WeightChart {...defaultProps} />);
    expect(screen.getByText("Weight Progress")).toBeInTheDocument();
  });

  it("displays current weight", () => {
    render(<WeightChart {...defaultProps} />);
    expect(screen.getByText("78.0 kg")).toBeInTheDocument();
  });

  it("shows weight change", () => {
    render(<WeightChart {...defaultProps} />);
    expect(screen.getByText("-2.0 kg")).toBeInTheDocument();
  });

  it("displays percentage change", () => {
    render(<WeightChart {...defaultProps} />);
    expect(screen.getByText("-2.5%")).toBeInTheDocument();
  });

  it("shows trend direction", () => {
    render(<WeightChart {...defaultProps} />);
    expect(screen.getByText("Decreasing")).toBeInTheDocument();
  });

  it("renders the chart canvas", () => {
    render(<WeightChart {...defaultProps} />);
    expect(screen.getByTestId("weight-chart")).toBeInTheDocument();
  });

  it("shows target weight line when goal is visible", () => {
    render(<WeightChart {...defaultProps} />);
    expect(screen.getByText("Goal: 75.0 kg")).toBeInTheDocument();
  });

  it("hides goal line when disabled", () => {
    render(<WeightChart {...defaultProps} showGoalLine={false} />);
    expect(screen.queryByText("Goal: 75.0 kg")).not.toBeInTheDocument();
  });

  it("renders date range selector", () => {
    render(<WeightChart {...defaultProps} />);
    expect(screen.getByText("7D")).toBeInTheDocument();
    expect(screen.getByText("30D")).toBeInTheDocument();
    expect(screen.getByText("90D")).toBeInTheDocument();
    expect(screen.getByText("1Y")).toBeInTheDocument();
  });

  it("calls onDateRangeChange when range is selected", () => {
    render(<WeightChart {...defaultProps} />);
    fireEvent.click(screen.getByText("7D"));
    expect(defaultProps.onDateRangeChange).toHaveBeenCalledWith("7d");
  });

  it("highlights selected date range", () => {
    render(<WeightChart {...defaultProps} dateRange="30d" />);
    expect(screen.getByText("30D")).toHaveAttribute("aria-pressed", "true");
  });

  it("displays min and max weights", () => {
    render(<WeightChart {...defaultProps} />);
    expect(screen.getByText("Max: 80.0 kg")).toBeInTheDocument();
    expect(screen.getByText("Min: 78.0 kg")).toBeInTheDocument();
  });

  it("shows average weight", () => {
    render(<WeightChart {...defaultProps} />);
    expect(screen.getByText("Avg: 79.0 kg")).toBeInTheDocument();
  });

  it("displays empty state", () => {
    render(<WeightChart {...defaultProps} data={[]} />);
    expect(screen.getByText("No weight data yet")).toBeInTheDocument();
    expect(
      screen.getByText("Start logging your weight to see progress")
    ).toBeInTheDocument();
  });

  it("renders with different unit", () => {
    render(
      <WeightChart
        {...defaultProps}
        data={[{ date: new Date(), value: 172 }]}
        unit="lbs"
      />
    );
    expect(screen.getByText("172.0 lbs")).toBeInTheDocument();
  });

  it("shows BMI indicator when provided", () => {
    render(<WeightChart {...defaultProps} bmi={24.5} />);
    expect(screen.getByText("BMI: 24.5")).toBeInTheDocument();
  });

  it("displays weekly averages", () => {
    render(<WeightChart {...defaultProps} showWeeklyAverage />);
    expect(screen.getByText("Weekly Avg")).toBeInTheDocument();
  });

  it("renders chart legend", () => {
    render(<WeightChart {...defaultProps} />);
    expect(screen.getByText("Weight")).toBeInTheDocument();
    expect(screen.getByText("Goal")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <WeightChart {...defaultProps} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("shows loading state", () => {
    render(<WeightChart {...defaultProps} isLoading />);
    expect(screen.getByTestId("chart-skeleton")).toBeInTheDocument();
  });

  it("renders export button", () => {
    render(<WeightChart {...defaultProps} showExport />);
    expect(screen.getByText("Export")).toBeInTheDocument();
  });

  it("renders add entry button", () => {
    const onAddEntry = jest.fn();
    render(<WeightChart {...defaultProps} onAddEntry={onAddEntry} />);
    fireEvent.click(screen.getByText("Log Weight"));
    expect(onAddEntry).toHaveBeenCalled();
  });

  it("displays last updated timestamp", () => {
    render(<WeightChart {...defaultProps} />);
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });

  it("shows projection line when enabled", () => {
    render(<WeightChart {...defaultProps} showProjection />);
    expect(screen.getByText("Projection")).toBeInTheDocument();
  });

  it("renders mini sparkline in header", () => {
    render(<WeightChart {...defaultProps} variant="mini" />);
    expect(screen.getByTestId("sparkline")).toBeInTheDocument();
  });
});
