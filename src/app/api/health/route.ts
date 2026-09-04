import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number }> = {};

  // Database check
  try {
    const start = performance.now();
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
    };
  } catch {
    checks.database = { status: "unhealthy" };
  }

  // Redis check
  try {
    const start = performance.now();
    const { redis } = await import("@/lib/redis");
    await redis.ping();
    checks.redis = {
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
    };
  } catch {
    checks.redis = { status: "unhealthy" };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === "healthy");

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "unknown",
      uptime: process.uptime(),
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
