import type { DockerClient } from "../../infrastructure/docker/docker.client";
import { LogBuffer } from "./log.buffer";
import type { LogEntry } from "./log.types";

type Subscriber = (entry: LogEntry) => void;
type Stream = {
  subscribers: Set<Subscriber>;
  controller: AbortController;
  buffer: LogBuffer;
};

export class LogManager {
  private streams = new Map<string, Stream>();
  constructor(private readonly docker: DockerClient) {}

  subscribe(containerId: string, subscriber: Subscriber) {
    let stream = this.streams.get(containerId);
    if (!stream) {
      stream = {
        subscribers: new Set(),
        controller: new AbortController(),
        buffer: new LogBuffer(),
      };
      this.streams.set(containerId, stream);
      this.start(containerId, stream);
    }
    stream.subscribers.add(subscriber);
    return () => {
      stream?.subscribers.delete(subscriber);
      if (stream && stream.subscribers.size === 0) {
        stream.controller.abort();
        this.streams.delete(containerId);
      }
    };
  }

  close() {
    for (const stream of this.streams.values()) stream.controller.abort();
    this.streams.clear();
  }

  private async start(containerId: string, stream: Stream) {
    try {
      for await (const entry of this.docker.followLogs(containerId, {
        tail: 0,
        signal: stream.controller.signal,
      })) {
        stream.buffer.push(entry);
        for (const subscriber of stream.subscribers) subscriber(entry);
      }
    } catch (error) {
      if (!stream.controller.signal.aborted)
        console.error(`Log stream ${containerId} falhou`, error);
    } finally {
      if (this.streams.get(containerId) === stream)
        this.streams.delete(containerId);
    }
  }
}
