import { NextResponse } from "next/server";
import type { Period } from "@/lib/analytics/fail-rate";

export function parsePeriod(param: string | null): { period: Period } | { error: NextResponse } {
  if (!param) return { period: 30 };
  if (!["1", "7", "30"].includes(param)) {
    return {
      error: NextResponse.json(
        { error: "Invalid period. Must be 1, 7, or 30." },
        { status: 400 }
      ),
    };
  }
  return { period: parseInt(param) as Period };
}

export function requireParam(
  value: string | null,
  name: string
): { value: string } | { error: NextResponse } {
  if (!value || value.trim() === "") {
    return {
      error: NextResponse.json(
        { error: `Missing required parameter: ${name}` },
        { status: 400 }
      ),
    };
  }
  return { value };
}

export function serverError(err: unknown): NextResponse {
  // Never expose stack traces
  const message = err instanceof Error ? err.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}
