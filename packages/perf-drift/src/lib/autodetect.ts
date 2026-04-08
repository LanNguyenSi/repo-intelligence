/**
 * Auto-detect performance metrics from common tools
 */

import { glob } from "glob";
import { statSync } from "fs";
import { loadConfig } from "./config.js";

export interface DetectedMetrics {
  buildTime?: number;
  bundleSize?: number;
  testTime?: number;
}

export async function autoDetectMetrics(): Promise<DetectedMetrics> {
  const metrics: DetectedMetrics = {};
  metrics.bundleSize = await detectBundleSize();
  return metrics;
}

async function detectBundleSize(): Promise<number | undefined> {
  const config = loadConfig();
  const distDirs = config.directories;

  for (const dir of distDirs) {
    try {
      const files = await glob(`${dir}/**/*.{js,mjs,cjs}`, { ignore: ["**/node_modules/**"] });

      if (files.length === 0) continue;

      let totalSize = 0;
      for (const file of files) {
        const stats = statSync(file);
        totalSize += stats.size;
      }

      return totalSize;
    } catch {
      continue;
    }
  }

  return undefined;
}
