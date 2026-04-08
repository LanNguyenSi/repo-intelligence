/**
 * Configuration file support (.perfdriftrc.json)
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

export interface DriftConfig {
  threshold: number;
  directories: string[];
}

const DEFAULT_CONFIG: DriftConfig = {
  threshold: 10,
  directories: ["dist", "build", "out", ".next"],
};

const CONFIG_FILENAMES = [".perfdriftrc.json", ".perfdriftrc"];

export function loadConfig(): DriftConfig {
  for (const filename of CONFIG_FILENAMES) {
    const filepath = join(process.cwd(), filename);
    if (existsSync(filepath)) {
      try {
        const raw = readFileSync(filepath, "utf-8");
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_CONFIG, ...parsed };
      } catch {
        // Invalid config file, fall through to defaults
      }
    }
  }

  return { ...DEFAULT_CONFIG };
}
