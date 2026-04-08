// ============================================================================
// repo-health — Health Checks
// ============================================================================

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

export interface CheckResult {
  name: string;
  category: string;
  passed: boolean;
  score: number; // 0-10
  message: string;
  suggestion?: string;
}

export interface HealthReport {
  path: string;
  checks: CheckResult[];
  score: number; // overall 0-10
  grade: string; // A, B, C, D, F
  summary: string;
}

function fileExists(dir: string, ...names: string[]): string | null {
  for (const name of names) {
    if (existsSync(join(dir, name))) return name;
  }
  return null;
}

function fileSize(dir: string, name: string): number {
  try {
    return statSync(join(dir, name)).size;
  } catch {
    return 0;
  }
}

function readFile(dir: string, name: string): string {
  try {
    return readFileSync(join(dir, name), "utf-8");
  } catch {
    return "";
  }
}

function hasAnyTestFile(dir: string): boolean {
  if (!existsSync(dir)) {
    return false;
  }

  const queue: string[] = [dir];
  const skip = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage"]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    let entries: string[] = [];
    try {
      entries = readdirSync(current);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = join(current, entry);
      let stats;
      try {
        stats = statSync(full);
      } catch {
        continue;
      }

      if (stats.isDirectory()) {
        if (!skip.has(entry)) {
          queue.push(full);
        }
        continue;
      }

      if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry)) {
        return true;
      }
    }
  }

  return false;
}

// --- Documentation Checks ---

function checkReadme(dir: string): CheckResult {
  const found = fileExists(dir, "README.md", "readme.md", "Readme.md");
  if (!found) {
    return { name: "README", category: "docs", passed: false, score: 0, message: "No README found", suggestion: "Add a README.md with project overview, setup, and usage" };
  }
  const size = fileSize(dir, found);
  if (size < 200) {
    return { name: "README", category: "docs", passed: true, score: 5, message: `README exists but is short (${size} bytes)`, suggestion: "Expand README with Quick Start, usage examples, and architecture overview" };
  }
  if (size < 1000) {
    return { name: "README", category: "docs", passed: true, score: 7, message: `README exists (${size} bytes)`, suggestion: "Consider adding more sections (Contributing, License, etc.)" };
  }
  return { name: "README", category: "docs", passed: true, score: 10, message: `Comprehensive README (${size} bytes)` };
}

function checkLicense(dir: string): CheckResult {
  const found = fileExists(dir, "LICENSE", "LICENSE.md", "license", "COPYING");
  if (!found) {
    return { name: "License", category: "docs", passed: false, score: 0, message: "No LICENSE file found", suggestion: "Add a LICENSE file (MIT recommended for open source)" };
  }
  return { name: "License", category: "docs", passed: true, score: 10, message: `License file: ${found}` };
}

function checkContributing(dir: string): CheckResult {
  const found = fileExists(dir, "CONTRIBUTING.md", "contributing.md");
  if (!found) {
    return { name: "Contributing Guide", category: "docs", passed: false, score: 0, message: "No CONTRIBUTING.md", suggestion: "Add CONTRIBUTING.md for open source projects" };
  }
  return { name: "Contributing Guide", category: "docs", passed: true, score: 10, message: "CONTRIBUTING.md exists" };
}

// --- Code Quality Checks ---

function checkGitignore(dir: string): CheckResult {
  const found = fileExists(dir, ".gitignore");
  if (!found) {
    return { name: ".gitignore", category: "quality", passed: false, score: 0, message: "No .gitignore found", suggestion: "Add .gitignore to prevent tracking node_modules, dist, .env, etc." };
  }
  const content = readFile(dir, ".gitignore");
  const hasNodeModules = content.includes("node_modules");
  const hasEnv = content.includes(".env");
  const hasDist = content.includes("dist") || content.includes(".next") || content.includes("build");

  let score = 5;
  const missing: string[] = [];
  if (hasNodeModules) score += 2; else missing.push("node_modules");
  if (hasEnv) score += 2; else missing.push(".env");
  if (hasDist) score += 1; else missing.push("dist/build");

  if (missing.length > 0) {
    return { name: ".gitignore", category: "quality", passed: true, score, message: `.gitignore exists but missing: ${missing.join(", ")}`, suggestion: `Add ${missing.join(", ")} to .gitignore` };
  }
  return { name: ".gitignore", category: "quality", passed: true, score: 10, message: ".gitignore is comprehensive" };
}

function checkEnvExample(dir: string): CheckResult {
  const hasEnv = fileExists(dir, ".env", ".env.local");
  const hasExample = fileExists(dir, ".env.example", ".env.local.example", ".env.sample");

  if (!hasEnv && !hasExample) {
    return { name: "Env Config", category: "quality", passed: true, score: 7, message: "No .env files (may not need them)" };
  }
  if (hasEnv && !hasExample) {
    return { name: "Env Config", category: "quality", passed: false, score: 3, message: ".env exists but no .env.example", suggestion: "Add .env.example so others know required variables" };
  }
  return { name: "Env Config", category: "quality", passed: true, score: 10, message: ".env.example exists" };
}

function checkTypeScript(dir: string): CheckResult {
  const hasTsConfig = fileExists(dir, "tsconfig.json");
  if (!hasTsConfig) {
    return { name: "TypeScript", category: "quality", passed: false, score: 0, message: "No tsconfig.json", suggestion: "Consider using TypeScript for type safety" };
  }
  const content = readFile(dir, "tsconfig.json");
  const hasStrict = content.includes('"strict": true') || content.includes('"strict":true');
  if (hasStrict) {
    return { name: "TypeScript", category: "quality", passed: true, score: 10, message: "TypeScript with strict mode ✅" };
  }
  return { name: "TypeScript", category: "quality", passed: true, score: 7, message: "TypeScript configured (not strict)", suggestion: "Enable strict mode for better type safety" };
}

// --- CI/CD Checks ---

function checkCI(dir: string): CheckResult {
  const hasGHA = existsSync(join(dir, ".github", "workflows"));
  const hasGitlab = fileExists(dir, ".gitlab-ci.yml");
  const hasCircle = existsSync(join(dir, ".circleci"));

  if (hasGHA || hasGitlab || hasCircle) {
    return { name: "CI Pipeline", category: "ci", passed: true, score: 10, message: `CI configured (${hasGHA ? "GitHub Actions" : hasGitlab ? "GitLab CI" : "CircleCI"})` };
  }
  return { name: "CI Pipeline", category: "ci", passed: false, score: 0, message: "No CI pipeline found", suggestion: "Add GitHub Actions, GitLab CI, or similar for automated testing" };
}

// --- Testing Checks ---

function checkTests(dir: string): CheckResult {
  const hasTestDir = existsSync(join(dir, "tests")) || existsSync(join(dir, "__tests__")) || existsSync(join(dir, "test"));
  const hasTestFiles = hasAnyTestFile(join(dir, "src")) || hasAnyTestFile(dir);
  const hasTestConfig = fileExists(dir, "vitest.config.ts", "vitest.config.js", "jest.config.ts", "jest.config.js", "jest.config.mjs");
  let hasTestScript = false;
  try {
    const parsed = JSON.parse(readFile(dir, "package.json")) as {
      scripts?: Record<string, string>;
    };
    hasTestScript = typeof parsed.scripts?.test === "string";
  } catch {
    hasTestScript = false;
  }

  if (hasTestDir || hasTestFiles || hasTestConfig) {
    return { name: "Tests", category: "testing", passed: true, score: hasTestScript ? 10 : 7, message: "Test setup found", suggestion: hasTestScript ? undefined : 'Add "test" script to package.json' };
  }
  if (hasTestScript) {
    return { name: "Tests", category: "testing", passed: true, score: 7, message: "Test script exists (no test directory found)" };
  }
  return { name: "Tests", category: "testing", passed: false, score: 0, message: "No tests found", suggestion: "Add tests with Vitest or Jest" };
}

// --- Security Checks ---

function checkSecrets(dir: string): CheckResult {
  const gitignore = readFile(dir, ".gitignore");
  const hasEnvIgnored = gitignore.includes(".env");

  if (existsSync(join(dir, ".env")) && !hasEnvIgnored) {
    return { name: "Secret Safety", category: "security", passed: false, score: 0, message: "⚠️ .env exists but NOT in .gitignore!", suggestion: "Add .env to .gitignore IMMEDIATELY" };
  }
  if (hasEnvIgnored) {
    return { name: "Secret Safety", category: "security", passed: true, score: 10, message: ".env is in .gitignore ✅" };
  }
  return { name: "Secret Safety", category: "security", passed: true, score: 8, message: "No .env file found (OK)" };
}

// --- Docker Checks ---

function checkDocker(dir: string): CheckResult {
  const hasDockerfile = fileExists(dir, "Dockerfile");
  const hasCompose = fileExists(dir, "docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml");

  if (hasDockerfile && hasCompose) {
    return { name: "Docker", category: "deployment", passed: true, score: 10, message: "Dockerfile + Docker Compose ✅" };
  }
  if (hasDockerfile) {
    return { name: "Docker", category: "deployment", passed: true, score: 7, message: "Dockerfile exists (no Compose)" };
  }
  return { name: "Docker", category: "deployment", passed: false, score: 0, message: "No Docker config", suggestion: "Add Dockerfile for containerized deployment" };
}

// --- AI Context Checks ---

function checkAIContext(dir: string): CheckResult {
  const hasAiDir = existsSync(join(dir, ".ai"));
  const hasAiContext = fileExists(dir, "AI_CONTEXT.md");

  if (hasAiDir) {
    const files = ["AGENTS.md", "ARCHITECTURE.md", "TASKS.md", "DECISIONS.md"]
      .filter((f) => existsSync(join(dir, ".ai", f)));
    return { name: "AI Context", category: "ai", passed: true, score: Math.min(10, files.length * 2.5), message: `.ai/ directory (${files.length}/4 files: ${files.join(", ")})` };
  }
  if (hasAiContext) {
    return { name: "AI Context", category: "ai", passed: true, score: 5, message: "AI_CONTEXT.md exists" };
  }
  return { name: "AI Context", category: "ai", passed: false, score: 0, message: "No AI context files", suggestion: "Add .ai/ directory for agent-friendly development" };
}

// --- Run All Checks ---

export function runHealthCheck(dir: string): HealthReport {
  const checks = [
    checkReadme(dir),
    checkLicense(dir),
    checkContributing(dir),
    checkGitignore(dir),
    checkEnvExample(dir),
    checkTypeScript(dir),
    checkCI(dir),
    checkTests(dir),
    checkSecrets(dir),
    checkDocker(dir),
    checkAIContext(dir),
  ];

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.length * 10;
  const score = Math.round((totalScore / maxScore) * 100) / 10;

  let grade: string;
  if (score >= 9) grade = "A";
  else if (score >= 8) grade = "B";
  else if (score >= 7) grade = "C";
  else if (score >= 5) grade = "D";
  else grade = "F";

  const passed = checks.filter((c) => c.passed).length;
  const summary = `${passed}/${checks.length} checks passed — Grade: ${grade} (${score}/10)`;

  return { path: dir, checks, score, grade, summary };
}
