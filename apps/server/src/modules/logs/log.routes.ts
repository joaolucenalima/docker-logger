import type { FastifyInstance, FastifyReply } from "fastify";
import { DockerUnavailableError, NotFoundError } from "../../shared/errors";
import type { LogService } from "./log.service";

export function registerLogRoutes(app: FastifyInstance, service: LogService) {
  app.get<{ Params: { id: string }; Querystring: { tail?: string } }>(
    "/api/containers/:id/logs",
    async (request, reply) => {
      const value = Number(request.query.tail ?? 1000);
      const tail = Number.isFinite(value)
        ? Math.min(Math.max(Math.floor(value), 1), 10_000)
        : 1000;
      try {
        return await service.recent(request.params.id, tail);
      } catch (error) {
        return sendDockerError(reply, error);
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/containers/:id/logs/stream",
    async (request, reply) => {
      try {
        await service.docker.getLogs(request.params.id, { tail: 0 });
      } catch (error) {
        return sendDockerError(reply, error);
      }
      reply.hijack();
      const response = reply.raw;
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      response.write(": connected\n\n");
      const unsubscribe = service.manager.subscribe(
        request.params.id,
        (entry) => response.write(`data: ${JSON.stringify(entry)}\n\n`),
      );
      const heartbeat = setInterval(
        () => response.write(": heartbeat\n\n"),
        15_000,
      );
      request.raw.once("close", () => {
        clearInterval(heartbeat);
        unsubscribe();
        response.end();
      });
    },
  );
}

function sendDockerError(reply: FastifyReply, error: unknown) {
  if (error instanceof NotFoundError)
    return reply.code(404).send({ error: error.message });
  if (error instanceof DockerUnavailableError)
    return reply.code(503).send({ error: error.message });
  throw error;
}
