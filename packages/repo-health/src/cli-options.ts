export function parseMinScore(value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid --min-score value "${value}". Expected a number between 0 and 10.`);
  }

  if (parsed < 0 || parsed > 10) {
    throw new Error(`Invalid --min-score value "${value}". Expected a number between 0 and 10.`);
  }

  return parsed;
}
