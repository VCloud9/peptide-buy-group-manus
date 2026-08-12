import type { Express } from "express";

/**
 * A dependency-free liveness endpoint for host health checks. It must remain
 * public and avoid querying the database so a healthy process is recognized
 * even when optional integrations are unavailable.
 */
export function registerHealthRoute(app: Express) {
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
}
