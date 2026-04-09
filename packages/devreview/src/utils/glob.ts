function escapeRegex(source: string): string {
  return source.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

export function globToRegExp(pattern: string): RegExp {
  const normalizedPattern = pattern.replace(/\\/g, '/');
  let regex = '^';

  for (let index = 0; index < normalizedPattern.length; index += 1) {
    const char = normalizedPattern[index];
    const next = normalizedPattern[index + 1];

    if (char === '*' && next === '*') {
      regex += '.*';
      index += 1;
      continue;
    }

    if (char === '*') {
      regex += '[^/]*';
      continue;
    }

    if (char === '?') {
      regex += '[^/]';
      continue;
    }

    regex += escapeRegex(char);
  }

  regex += '$';

  return new RegExp(regex);
}

export function matchesGlob(pattern: string, value: string): boolean {
  return globToRegExp(pattern).test(value.replace(/\\/g, '/'));
}
