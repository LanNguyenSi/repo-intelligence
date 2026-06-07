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
  // Log the real error server-side, but never leak internal messages or stack
  // traces to the client. Always return a fixed generic body.
  console.error(err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
