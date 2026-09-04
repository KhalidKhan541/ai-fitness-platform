import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/lib/globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FitAI — AI-Powered Fitness & Health Platform",
  description:
    "Transform your fitness journey with AI-powered workouts, nutrition tracking, and personalized coaching.",
  keywords: [
    "fitness",
    "AI trainer",
    "workout tracker",
    "nutrition",
    "health platform",
  ],
  openGraph: {
    title: "FitAI — AI-Powered Fitness & Health Platform",
    description:
      "Transform your fitness journey with AI-powered workouts, nutrition tracking, and personalized coaching.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
