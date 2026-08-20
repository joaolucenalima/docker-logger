import type { LogEntry } from "./log.types";

export class LogBuffer {
  private entries: LogEntry[] = [];
  constructor(
    private readonly capacity = Number(process.env.LOG_BUFFER_SIZE ?? 10_000),
  ) {}
  push(entry: LogEntry) {
    this.entries.push(entry);
    if (this.entries.length > this.capacity) this.entries.shift();
  }
  tail(size: number) {
    return this.entries.slice(-size);
  }
}
