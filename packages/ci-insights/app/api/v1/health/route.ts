import { NextResponse } from "next/server";

/**
 * GET /api/v1/health
 * Health check endpoint — MCP/plugin integrations can use this to verify connectivity.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    service: "ci-insights",
  });
}
