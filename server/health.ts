import type { Express } from "express";
import { sql } from "drizzle-orm";
import { getDb } from "./db";

type HealthDependencies = {
  checkDatabase?: () => Promise<boolean>;
};

async function checkDatabaseConnection(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.execute(sql`select 1`);
    return true;
  } catch (error) {
    console.error("[Health] Database readiness check failed", error);
    return false;
  }
}

/**
 * A dependency-free liveness endpoint for host health checks. It must remain
 * public and avoid querying the database so a healthy process is recognized
 * even when optional integrations are unavailable.
 */
export function registerHealthRoute(app: Express, dependencies: HealthDependencies = {}) {
  const checkDatabase = dependencies.checkDatabase ?? checkDatabaseConnection;

  app.get("/api/health", async (_req, res) => {
    if (!(await checkDatabase())) {
      return res.status(503).json({ status: "unavailable", database: "unreachable" });
    }

    res.status(200).json({ status: "ok", database: "connected" });
  });
}
