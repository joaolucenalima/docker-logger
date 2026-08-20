import cors from "@fastify/cors";
import Fastify from "fastify";
import { DockerClient } from "./infrastructure/docker/docker.client";
import { registerContainerRoutes } from "./modules/containers/container.routes";
import { ContainerService } from "./modules/containers/container.service";
import { LogManager } from "./modules/logs/log.manager";
import { registerLogRoutes } from "./modules/logs/log.routes";
import { LogService } from "./modules/logs/log.service";

export async function buildApp() {
  const app = Fastify({ logger: true });
  const docker = new DockerClient();
  const logManager = new LogManager(docker);

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3001",
    methods: ["GET"],
  });
  app.get("/", async () => ({ status: "ok" }));
  registerContainerRoutes(app, new ContainerService(docker));
  registerLogRoutes(app, new LogService(docker, logManager));
  app.addHook("onClose", async () => logManager.close());
  return app;
}
