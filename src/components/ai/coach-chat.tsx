"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

interface CoachChatProps {
  initialMessages?: ChatMessage[];
  className?: string;
}

const suggestions = [
  "Create a workout plan for me",
  "What should I eat post-workout?",
  "How can I improve my bench press?",
  "Analyze my sleep data",
  "Help me break through a plateau",
];

const responses: Record<string, string> = {
  workout: "Based on your recent activity, I'd recommend a Push/Pull/Legs split this week. Here's a suggested plan:\n\n• Monday: Push (Chest, Shoulders, Triceps)\n• Tuesday: Pull (Back, Biceps)\n• Wednesday: Legs (Quads, Hamstrings, Calves)\n• Thursday: Rest or Active Recovery\n• Friday: Upper Body Power\n• Saturday: Lower Body Hypertrophy\n• Sunday: Rest\n\nWant me to create detailed workouts for each day?",
  food: "Great question! Post-workout nutrition is crucial for recovery:\n\n• Protein: 25-40g (whey shake, chicken, Greek yogurt)\n• Carbs: 50-80g (rice, oats, banana, sweet potato)\n• Timing: Within 30-60 minutes after training\n\nA simple option: protein shake with a banana and honey. This will replenish glycogen and kickstart muscle repair.",
  bench: "To improve your bench press:\n\n1. Technique: Retract shoulder blades, arch slightly, drive feet into floor\n2. Accessories: Add close-grip bench and dips for triceps\n3. Programming: Weekly periodization — heavy (5x3), moderate (4x6), volume (3x12)\n4. Weak Points: If it stalls off the chest, add paused reps\n\nConsistency is key. Progress 2.5 lbs per week.",
  sleep: "Looking at your sleep data:\n\n• Average duration: 7.6 hours (good!)\n• Quality varies — best nights correlate with earlier bedtimes\n• Deep sleep is slightly below optimal\n\nRecommendations:\n1. Sleep before 10:30 PM consistently\n2. Avoid screens 1 hour before bed\n3. Keep room cool (65-68°F)\n4. Consider magnesium supplementation",
  plateau: "Breaking through a plateau:\n\n1. Deload: Take a lighter week to recover\n2. Change Stimulus: Switch rep ranges or exercise variations\n3. Check Basics: Are you eating enough? Sleeping 7+ hours?\n4. Progressive Overload: Track every workout, add small weight or reps\n5. Volume: You might need more weekly sets\n\nWhat specifically are you plateauing on?",
};

export default function CoachChat({ initialMessages = [], className }: CoachChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.length > 0
      ? initialMessages
      : [
          {
            id: "1",
            role: "assistant",
            content: "Hey! I'm your AI fitness coach. I can help with workouts, nutrition, form tips, and recovery. What can I help you with?",
            timestamp: new Date(Date.now() - 60000).toISOString(),
          },
        ]
  );
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = (content: string) => {
    if (!content.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const lowerContent = content.toLowerCase();
      let response = "That's a great question! Let me think about that...\n\nAs your AI coach, I'd recommend focusing on consistency with your training and nutrition. Based on your recent data, you're making solid progress. Keep pushing forward!";

      for (const [key, val] of Object.entries(responses)) {
        if (lowerContent.includes(key)) {
          response = val;
          break;
        }
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3",
                msg.role === "user"
                  ? "bg-fitness-600 text-white"
                  : "bg-muted text-foreground"
              )}
            >
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {msg.content.split("**").map((part, i) =>
                  i % 2 === 1 ? (
                    <strong key={i} className={msg.role === "user" ? "text-white" : "text-foreground"}>
                      {part}
                    </strong>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </div>
              <div className={cn("text-[10px] mt-1.5", msg.role === "user" ? "text-white/60" : "text-muted-foreground")}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="px-6 pb-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-border/30 p-4">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Ask your AI coach anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 h-11 rounded-xl border border-border bg-background px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fitness-500/50 focus:border-fitness-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="h-11 w-11 rounded-xl bg-fitness-600 text-white hover:bg-fitness-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
