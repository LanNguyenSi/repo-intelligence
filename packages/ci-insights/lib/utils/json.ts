/**
 * Safely serialize objects containing BigInt to JSON.
 * BigInt → string to avoid JSON.stringify TypeError.
 */
export function safeJsonResponse(data: unknown): Response {
  const json = JSON.stringify(data, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
  return new Response(json, {
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Replace BigInt values with strings in an object (for NextResponse.json compatibility).
 */
export function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}
