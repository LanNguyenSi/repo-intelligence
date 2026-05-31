import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison of two strings. Returns false if lengths differ.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Guard write/sync endpoints behind a shared secret.
 *
 * Compares the `Authorization: Bearer <token>` header against the
 * `SYNC_API_KEY` env var. Fails closed: if `SYNC_API_KEY` is unset or empty,
 * every request is rejected so the endpoint is never accidentally open.
 *
 * @returns a 401 `NextResponse` to short-circuit the handler, or `null` when
 *   the request is authorized.
 */
export function requireApiKey(request: Request): NextResponse | null {
  const expected = process.env.SYNC_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "Sync API is not configured" },
      { status: 401 }
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const provided = match?.[1]?.trim() ?? "";

  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
