/**
 * SQLite database for performance metrics
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CURRENT_SCHEMA_VERSION = 1;

const DB_PATH = process.env.NODE_ENV === "test"
  ? ":memory:"
  : join(homedir(), ".perf-drift", "metrics.db");
const DATA_DIR = join(homedir(), ".perf-drift");

export interface Metric {
  id?: number;
  timestamp: number;
  buildTime?: number;
  bundleSize?: number;
  testTime?: number;
  message?: string;
  baseline: boolean;
}

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);
  runMigrations(db);

  dbInstance = db;
  return db;
}

function runMigrations(db: Database.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)`);

  const row = db.prepare(`SELECT version FROM schema_version LIMIT 1`).get() as { version: number } | undefined;
  const currentVersion = row?.version ?? 0;

  if (currentVersion < 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        buildTime REAL,
        bundleSize INTEGER,
        testTime REAL,
        message TEXT,
        baseline INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_timestamp ON metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_baseline ON metrics(baseline);
    `);
  }

  // Future migrations go here:
  // if (currentVersion < 2) { ... }

  if (currentVersion === 0) {
    db.prepare(`INSERT INTO schema_version (version) VALUES (?)`).run(CURRENT_SCHEMA_VERSION);
  } else if (currentVersion < CURRENT_SCHEMA_VERSION) {
    db.prepare(`UPDATE schema_version SET version = ?`).run(CURRENT_SCHEMA_VERSION);
  }
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function resetDb(): void {
  const db = getDb();
  db.exec(`DELETE FROM metrics`);
}

export function insertMetric(metric: Metric): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO metrics (timestamp, buildTime, bundleSize, testTime, message, baseline)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    metric.timestamp,
    metric.buildTime ?? null,
    metric.bundleSize ?? null,
    metric.testTime ?? null,
    metric.message ?? null,
    metric.baseline ? 1 : 0
  );

  return result.lastInsertRowid as number;
}

export function getMetrics(limit?: number): Metric[] {
  const db = getDb();
  const query = limit
    ? `SELECT * FROM metrics ORDER BY timestamp DESC LIMIT ?`
    : `SELECT * FROM metrics ORDER BY timestamp DESC`;

  const stmt = db.prepare(query);
  const rows = limit ? stmt.all(limit) : stmt.all();

  return rows.map((row: any) => ({
    id: row.id,
    timestamp: row.timestamp,
    buildTime: row.buildTime,
    bundleSize: row.bundleSize,
    testTime: row.testTime,
    message: row.message,
    baseline: row.baseline === 1,
  }));
}

export function getMetricsSince(timestamp: number): Metric[] {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM metrics WHERE timestamp >= ? ORDER BY timestamp DESC`);
  const rows = stmt.all(timestamp);

  return rows.map((row: any) => ({
    id: row.id,
    timestamp: row.timestamp,
    buildTime: row.buildTime,
    bundleSize: row.bundleSize,
    testTime: row.testTime,
    message: row.message,
    baseline: row.baseline === 1,
  }));
}

export function getBaseline(): Metric | null {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM metrics WHERE baseline = 1 ORDER BY timestamp DESC LIMIT 1`);
  const row = stmt.get() as any;

  if (!row) return null;

  return {
    id: row.id,
    timestamp: row.timestamp,
    buildTime: row.buildTime,
    bundleSize: row.bundleSize,
    testTime: row.testTime,
    message: row.message,
    baseline: row.baseline === 1,
  };
}

export function setMetricAsBaseline(id: number): void {
  const db = getDb();
  db.prepare(`UPDATE metrics SET baseline = 0`).run();
  db.prepare(`UPDATE metrics SET baseline = 1 WHERE id = ?`).run(id);
}

export function clearAllBaselines(): void {
  const db = getDb();
  db.prepare(`UPDATE metrics SET baseline = 0`).run();
}
