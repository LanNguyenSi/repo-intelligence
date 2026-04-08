import { NextRequest, NextResponse } from "next/server";
import { getAllFailRates, getWorkflowFailRates } from "@/lib/analytics/fail-rate";
import { parsePeriod, serverError } from "@/lib/utils/validation";

/**
 * GET /api/v1/analytics/fail-rate
 * Query params:
 *   - repo: owner/repo (optional — if omitted, returns all repos)
 *   - period: 1 | 7 | 30 (default: 30)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const repo = searchParams.get("repo");
  const periodParam = searchParams.get("period");

  const periodResult = parsePeriod(periodParam);
  if ("error" in periodResult) return periodResult.error;
  const { period } = periodResult;

  try {
    const data = repo
      ? await getWorkflowFailRates(repo, period)
      : await getAllFailRates(period);

    return NextResponse.json({ period, data });
  } catch (err: unknown) {
    return serverError(err);
  }
}
