import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { resolve } from "node:path";
import { DockerClient } from "./infrastructure/docker/docker.client";
import { registerContainerRoutes } from "./modules/containers/container.routes";
import { ContainerService } from "./modules/containers/container.service";
import { LogManager } from "./modules/logs/log.manager";
import { registerLogRoutes } from "./modules/logs/log.routes";
import { LogService } from "./modules/logs/log.service";

interface BuildAppOptions {
  staticRoot?: string | false;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({ logger: true });
  const docker = new DockerClient();
  const logManager = new LogManager(docker);

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3001",
    methods: ["GET"],
  });
  app.get("/health", async () => ({ status: "ok" }));
  registerContainerRoutes(app, new ContainerService(docker));
  registerLogRoutes(app, new LogService(docker, logManager));

  const staticRoot =
    options.staticRoot === undefined
      ? process.env.STATIC_ROOT
        ? resolve(process.env.STATIC_ROOT)
        : false
      : options.staticRoot;

  if (staticRoot) {
    await app.register(fastifyStatic, { root: resolve(staticRoot) });
    app.setNotFoundHandler((request, reply) => {
      if (request.url === "/api" || request.url.startsWith("/api/")) {
        return reply.code(404).send({ error: "Not Found" });
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        return reply.code(404).send({ error: "Not Found" });
      }
      return reply.sendFile("index.html");
    });
  }

  app.addHook("onClose", async () => logManager.close());
  return app;
}
