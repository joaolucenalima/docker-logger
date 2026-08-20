import type { DockerClient } from "../../infrastructure/docker/docker.client";

export class ContainerService {
  constructor(private readonly docker: DockerClient) {}
  list() {
    return this.docker.listContainers();
  }
}
