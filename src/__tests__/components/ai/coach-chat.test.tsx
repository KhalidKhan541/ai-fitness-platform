import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CoachChat } from "@/components/ai/coach-chat";

const mockMessages = [
  {
    id: "msg-1",
    role: "assistant",
    content: "Hi! I'm your AI fitness coach. How can I help you today?",
    timestamp: new Date("2024-01-15T10:00:00Z"),
  },
  {
    id: "msg-2",
    role: "user",
    content: "Can you create a workout plan for me?",
    timestamp: new Date("2024-01-15T10:01:00Z"),
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "Of course! Based on your profile, I recommend a 4-day strength program focusing on compound movements.",
    timestamp: new Date("2024-01-15T10:01:30Z"),
  },
];

describe("CoachChat", () => {
  const defaultProps = {
    messages: mockMessages,
    onSendMessage: jest.fn(),
    onSuggestionClick: jest.fn(),
    isLoading: false,
    isTyping: false,
    suggestions: [
      "Create a workout plan",
      "Analyze my progress",
      "Nutrition advice",
    ],
    userProfile: {
      name: "Alice",
      fitnessLevel: "intermediate",
      goals: ["lose_weight"],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders chat header", () => {
    render(<CoachChat {...defaultProps} />);
    expect(screen.getByText("AI Coach")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("displays coach avatar", () => {
    render(<CoachChat {...defaultProps} />);
    expect(screen.getByTestId("coach-avatar")).toBeInTheDocument();
  });

  it("renders welcome message for empty chat", () => {
    render(<CoachChat {...defaultProps} messages={[]} />);
    expect(
      screen.getByText(/Hi Alice! I'm your AI fitness coach/)
    ).toBeInTheDocument();
  });

  it("displays message history", () => {
    render(<CoachChat {...defaultProps} />);
    expect(
      screen.getByText("Hi! I'm your AI fitness coach. How can I help you today?")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Can you create a workout plan for me?")
    ).toBeInTheDocument();
  });

  it("renders user messages differently from assistant", () => {
    render(<CoachChat {...defaultProps} />);
    const userMessage = screen.getByText(
      "Can you create a workout plan for me?"
    );
    const assistantMessage = screen.getByText(
      "Hi! I'm your AI fitness coach. How can I help you today?"
    );

    expect(userMessage.closest("[data-role]")).toHaveAttribute(
      "data-role",
      "user"
    );
    expect(assistantMessage.closest("[data-role]")).toHaveAttribute(
      "data-role",
      "assistant"
    );
  });

  it("shows typing indicator when loading", () => {
    render(<CoachChat {...defaultProps} isTyping />);
    expect(screen.getByTestId("typing-indicator")).toBeInTheDocument();
  });

  it("renders message input", () => {
    render(<CoachChat {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Ask your AI coach...")
    ).toBeInTheDocument();
  });

  it("calls onSendMessage when form is submitted", () => {
    render(<CoachChat {...defaultProps} />);
    const input = screen.getByPlaceholderText("Ask your AI coach...");
    fireEvent.change(input, { target: { value: "What should I eat?" } });
    fireEvent.click(screen.getByLabelText("Send message"));

    expect(defaultProps.onSendMessage).toHaveBeenCalledWith(
      "What should I eat?"
    );
  });

  it("calls onSendMessage on Enter key", () => {
    render(<CoachChat {...defaultProps} />);
    const input = screen.getByPlaceholderText("Ask your AI coach...");
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.keyPress(input, { key: "Enter", code: 13 });

    expect(defaultProps.onSendMessage).toHaveBeenCalledWith("Hello");
  });

  it("clears input after sending", () => {
    render(<CoachChat {...defaultProps} />);
    const input = screen.getByPlaceholderText("Ask your AI coach...");
    fireEvent.change(input, { target: { value: "Test message" } });
    fireEvent.click(screen.getByLabelText("Send message"));

    expect(input).toHaveValue("");
  });

  it("disables send button when input is empty", () => {
    render(<CoachChat {...defaultProps} />);
    expect(screen.getByLabelText("Send message")).toBeDisabled();
  });

  it("enables send button when input has text", () => {
    render(<CoachChat {...defaultProps} />);
    const input = screen.getByPlaceholderText("Ask your AI coach...");
    fireEvent.change(input, { target: { value: "Hello" } });

    expect(screen.getByLabelText("Send message")).toBeEnabled();
  });

  it("disables input when loading", () => {
    render(<CoachChat {...defaultProps} isLoading />);
    const input = screen.getByPlaceholderText("Ask your AI coach...");
    expect(input).toBeDisabled();
  });

  it("shows suggestion chips", () => {
    render(<CoachChat {...defaultProps} />);
    expect(screen.getByText("Create a workout plan")).toBeInTheDocument();
    expect(screen.getByText("Analyze my progress")).toBeInTheDocument();
    expect(screen.getByText("Nutrition advice")).toBeInTheDocument();
  });

  it("calls onSuggestionClick when suggestion is clicked", () => {
    render(<CoachChat {...defaultProps} />);
    fireEvent.click(screen.getByText("Create a workout plan"));
    expect(defaultProps.onSuggestionClick).toHaveBeenCalledWith(
      "Create a workout plan"
    );
  });

  it("hides suggestions after first message", () => {
    render(<CoachChat {...defaultProps} />);
    expect(screen.getByText("Create a workout plan")).toBeInTheDocument();

    // After user sends message, suggestions should hide
    const input = screen.getByPlaceholderText("Ask your AI coach...");
    fireEvent.change(input, { target: { value: "Hi" } });
    fireEvent.click(screen.getByLabelText("Send message"));

    expect(
      screen.queryByText("Create a workout plan")
    ).not.toBeInTheDocument();
  });

  it("auto-scrolls to bottom on new message", () => {
    const { rerender } = render(<ChatWithScroll {...defaultProps} />);
    const scrollContainer = screen.getByTestId("chat-messages");

    rerender(
      <ChatWithScroll
        {...defaultProps}
        messages={[
          ...mockMessages,
          {
            id: "msg-4",
            role: "assistant",
            content: "New message!",
            timestamp: new Date(),
          },
        ]}
      />
    );

    expect(scrollContainer.scrollTop).toBeGreaterThan(0);
  });

  it("shows timestamps on messages", () => {
    render(<CoachChat {...defaultProps} />);
    expect(screen.getByText("10:00 AM")).toBeInTheDocument();
    expect(screen.getByText("10:01 AM")).toBeInTheDocument();
  });

  it("renders message actions on hover", async () => {
    render(<CoachChat {...defaultProps} />);
    const message = screen.getByText(
      "Can you create a workout plan for me?"
    );
    fireEvent.mouseEnter(message.closest("[data-role]")!);

    await waitFor(() => {
      expect(screen.getByLabelText("Copy message")).toBeInTheDocument();
    });
  });

  it("copies message to clipboard", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn() },
    });

    render(<CoachChat {...defaultProps} />);
    const message = screen.getByText(
      "Can you create a workout plan for me?"
    );
    fireEvent.mouseEnter(message.closest("[data-role]")!);

    await waitFor(() => {
      fireEvent.click(screen.getByLabelText("Copy message"));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "Can you create a workout plan for me?"
    );
  });

  it("shows quick action buttons", () => {
    render(<CoachChat {...defaultProps} showQuickActions />);
    expect(screen.getByText("Generate Workout")).toBeInTheDocument();
    expect(screen.getByText("Check Progress")).toBeInTheDocument();
    expect(screen.getByText("Meal Plan")).toBeInTheDocument();
  });

  it("renders with different themes", () => {
    const { container } = render(
      <CoachChat {...defaultProps} theme="dark" />
    );
    expect(container.firstChild).toHaveClass("dark");
  });

  it("shows message count", () => {
    render(<CoachChat {...defaultProps} />);
    expect(screen.getByText("3 messages")).toBeInTheDocument();
  });

  it("renders empty state when no messages", () => {
    render(<CoachChat {...defaultProps} messages={[]} />);
    expect(
      screen.getByText("Start a conversation with your AI coach")
    ).toBeInTheDocument();
  });

  it("handles long messages with text wrapping", () => {
    const longMessage = {
      id: "msg-long",
      role: "assistant",
      content: "A".repeat(500),
      timestamp: new Date(),
    };

    render(<ChatWithScroll {...defaultProps} messages={[longMessage]} />);
    expect(screen.getByText("A".repeat(500))).toBeInTheDocument();
  });

  it("renders connection status", () => {
    render(<CoachChat {...defaultProps} connectionStatus="reconnecting" />);
    expect(screen.getByText("Reconnecting...")).toBeInTheDocument();
  });

  it("shows error state", () => {
    render(
      <CoachChat
        {...defaultProps}
        error="Failed to get response. Please try again."
      />
    );
    expect(
      screen.getByText("Failed to get response. Please try again.")
    ).toBeInTheDocument();
  });
});

// Helper component for scroll tests
function ChatWithScroll(props: any) {
  return <CoachChat {...props} />;
}
