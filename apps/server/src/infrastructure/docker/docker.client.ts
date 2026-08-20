import { request } from "node:http";
import type { Container } from "../../modules/containers/container.types";
import { DockerLogParser } from "../../modules/logs/log.parser";
import type { LogEntry } from "../../modules/logs/log.types";
import { DockerUnavailableError, NotFoundError } from "../../shared/errors";

type DockerContainer = {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
};
type LogOptions = { tail?: number; follow?: boolean; signal?: AbortSignal };

export class DockerClient {
  private readonly socketPath =
    process.env.DOCKER_SOCKET ?? "/var/run/docker.sock";

  async listContainers(): Promise<Container[]> {
    const raw = await this.json<DockerContainer[]>("/containers/json?all=1");
    return raw.map((container) => ({
      id: container.Id,
      name: container.Names[0]?.replace(/^\//, "") ?? container.Id.slice(0, 12),
      image: container.Image,
      state: container.State,
    }));
  }

  async getLogs(
    containerId: string,
    options: LogOptions = {},
  ): Promise<LogEntry[]> {
    const parser = new DockerLogParser(containerId);
    const response = await this.openLogStream(containerId, options);
    const entries: LogEntry[] = [];
    for await (const chunk of response)
      entries.push(...parser.push(Buffer.from(chunk)));
    return [...entries, ...parser.flush()];
  }

  async *followLogs(
    containerId: string,
    options: LogOptions = {},
  ): AsyncGenerator<LogEntry> {
    const parser = new DockerLogParser(containerId);
    const response = await this.openLogStream(containerId, {
      ...options,
      follow: true,
    });
    for await (const chunk of response)
      for (const entry of parser.push(Buffer.from(chunk))) yield entry;
    for (const entry of parser.flush()) yield entry;
  }

  private openLogStream(containerId: string, options: LogOptions) {
    const params = new URLSearchParams({
      stdout: "1",
      stderr: "1",
      timestamps: "1",
      follow: options.follow ? "1" : "0",
      tail: String(options.tail ?? 1000),
    });
    return this.open(
      `/containers/${encodeURIComponent(containerId)}/logs?${params}`,
      options.signal,
    );
  }

  private async json<T>(path: string): Promise<T> {
    const response = await this.open(path);
    const chunks: Buffer[] = [];
    for await (const chunk of response) chunks.push(Buffer.from(chunk));
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
  }

  private open(
    path: string,
    signal?: AbortSignal,
  ): Promise<import("node:http").IncomingMessage> {
    return new Promise((resolve, reject) => {
      const req = request(
        { socketPath: this.socketPath, path, method: "GET", signal },
        (response) => {
          if (response.statusCode === 404) {
            reject(new NotFoundError("Container não encontrado."));
            return;
          }
          if ((response.statusCode ?? 500) >= 400) {
            reject(
              new DockerUnavailableError(
                `Docker respondeu ${response.statusCode}.`,
              ),
            );
            return;
          }
          resolve(response);
        },
      );
      req.once("error", (error: NodeJS.ErrnoException) => {
        reject(
          error.code === "ENOENT" || error.code === "ECONNREFUSED"
            ? new DockerUnavailableError("Docker não está disponível.")
            : error,
        );
      });
      req.end();
    });
  }
}
