/**
 * Input validation for CLI options
 */

export function validatePositiveNumber(value: string, name: string): number {
  const num = parseFloat(value);
  if (isNaN(num)) {
    throw new Error(`${name} must be a valid number, got "${value}"`);
  }
  if (num < 0) {
    throw new Error(`${name} must be positive, got ${num}`);
  }
  return num;
}

export function validatePositiveInt(value: string, name: string): number {
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`${name} must be a valid integer, got "${value}"`);
  }
  if (num < 0) {
    throw new Error(`${name} must be positive, got ${num}`);
  }
  return num;
}
