import type { DockerClient } from "../../infrastructure/docker/docker.client";
import type { LogManager } from "./log.manager";

export class LogService {
  constructor(
    readonly docker: DockerClient,
    readonly manager: LogManager,
  ) {}
  recent(containerId: string, tail: number) {
    return this.docker.getLogs(containerId, { tail });
  }
}
