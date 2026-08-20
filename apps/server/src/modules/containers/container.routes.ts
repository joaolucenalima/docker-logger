import type { FastifyInstance } from "fastify";
import { DockerUnavailableError } from "../../shared/errors";
import type { ContainerService } from "./container.service";

export function registerContainerRoutes(
  app: FastifyInstance,
  service: ContainerService,
) {
  app.get("/api/containers", async (_request, reply) => {
    try {
      return await service.list();
    } catch (error) {
      if (error instanceof DockerUnavailableError)
        return reply.code(503).send({ error: error.message });
      throw error;
    }
  });
}
