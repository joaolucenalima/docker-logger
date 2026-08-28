import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { buildApp } from "./app";

describe("application shell", () => {
  let staticRoot: string;

  beforeAll(async () => {
    staticRoot = await mkdtemp(join(tmpdir(), "docker-logger-static-"));
    await mkdir(join(staticRoot, "assets"));
    await writeFile(
      join(staticRoot, "index.html"),
      "<!doctype html><html><body>Docker Logger</body></html>",
    );
    await writeFile(join(staticRoot, "assets", "app.js"), "export {};\n");
  });

  afterAll(async () => rm(staticRoot, { recursive: true, force: true }));

  test("exposes the health endpoint", async () => {
    const app = await buildApp({ staticRoot });
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('{"status":"ok"}');
    await app.close();
  });

  test("serves the SPA at the root and client-side routes", async () => {
    const app = await buildApp({ staticRoot });
    for (const url of ["/", "/containers/example"]) {
      const response = await app.inject({ method: "GET", url });
      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.body).toContain("Docker Logger");
    }
    await app.close();
  });

  test("serves static assets with their content type", async () => {
    const app = await buildApp({ staticRoot });
    const response = await app.inject({ method: "GET", url: "/assets/app.js" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("javascript");
    await app.close();
  });

  test("does not return the SPA fallback for unknown API routes", async () => {
    const app = await buildApp({ staticRoot });
    const response = await app.inject({ method: "GET", url: "/api/missing" });
    expect(response.statusCode).toBe(404);
    expect(response.headers["content-type"]).toContain("application/json");
    await app.close();
  });

  test("keeps the REST and SSE routes registered", async () => {
    const app = await buildApp({ staticRoot });
    expect(
      app.hasRoute({ method: "GET", url: "/api/containers" }),
    ).toBeTrue();
    expect(
      app.hasRoute({
        method: "GET",
        url: "/api/containers/:id/logs/stream",
      }),
    ).toBeTrue();
    await app.close();
  });
});
