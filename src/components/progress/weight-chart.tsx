"use client";

import { cn } from "@/lib/utils";
import type { WeightEntry } from "@/types";

interface WeightChartProps {
  data: WeightEntry[];
  className?: string;
}

export default function WeightChart({ data, className }: WeightChartProps) {
  if (data.length < 2) {
    return (
      <div className={cn("rounded-2xl border border-border/50 bg-card p-6", className)}>
        <h2 className="text-lg font-semibold mb-4">Weight Trend</h2>
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
          Log at least 2 weight entries to see your trend.
        </div>
      </div>
    );
  }

  const weights = data.map((d) => d.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 580 + 10,
    y: 220 - ((d.weight - min) / range) * 200,
  }));

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x},240 L ${points[0].x},240 Z`;

  const change = data[data.length - 1].weight - data[0].weight;

  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Weight Trend</h2>
        <span className={cn("text-sm font-medium", change <= 0 ? "text-fitness-500" : "text-red-500")}>
          {change > 0 ? "+" : ""}{change.toFixed(1)} lbs total
        </span>
      </div>
      <div className="relative h-64">
        <svg viewBox="0 0 600 250" className="w-full h-full">
          <defs>
            <linearGradient id="weightGradChart" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1="0" y1={i * 60} x2="600" y2={i * 60} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.5" />
          ))}
          <path d={areaD} fill="url(#weightGradChart)" />
          <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill="#22c55e" stroke="hsl(var(--card))" strokeWidth="2" />
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-2">
        <span>{data[0].date}</span>
        <span>{data[data.length - 1].date}</span>
      </div>
    </div>
  );
}
