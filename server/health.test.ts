import express from "express";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { registerHealthRoute } from "./health";

describe("Railway health endpoint", () => {
  it("returns a public 200 response without requiring database or OAuth access", async () => {
    const app = express();
    registerHealthRoute(app);

    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));

    try {
      const { port } = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ status: "ok" });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  });
});
