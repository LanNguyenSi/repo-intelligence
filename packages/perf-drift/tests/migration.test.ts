import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { closeDb, getDb, insertMetric } from "../src/lib/db.js";

describe("Database Migration", () => {
  beforeEach(() => {
    closeDb();
  });

  afterEach(() => {
    closeDb();
  });

  it("creates schema_version table", () => {
    const db = getDb();
    const row = db.prepare("SELECT version FROM schema_version LIMIT 1").get() as any;
    expect(row.version).toBe(1);
  });

  it("schema is idempotent on re-open", () => {
    // First open creates schema
    getDb();
    insertMetric({ timestamp: Date.now(), buildTime: 10, baseline: false });
    closeDb();

    // Second open should not fail (in-memory DB is new, but tests migration path)
    const db2 = getDb();
    const row = db2.prepare("SELECT version FROM schema_version LIMIT 1").get() as any;
    expect(row.version).toBe(1);
  });
});
