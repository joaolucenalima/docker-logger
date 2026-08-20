import type { LogEntry, LogStream } from "./log.types";

const decoder = new TextDecoder();
const timestampPattern =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\s?(.*)$/s;

export class DockerLogParser {
  private buffer = Buffer.alloc(0);
  private readonly lineBuffers: Record<LogStream, string> = {
    stdout: "",
    stderr: "",
  };
  private sequence = 0;
  constructor(private readonly containerId: string) {}

  push(chunk: Buffer): LogEntry[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const entries: LogEntry[] = [];
    while (this.buffer.length >= 8) {
      const streamType = this.buffer[0] ?? 0;
      const size = this.buffer.readUInt32BE(4);
      if (![1, 2].includes(streamType) || this.buffer.length < size + 8) break;
      const stream: LogStream = streamType === 2 ? "stderr" : "stdout";
      entries.push(
        ...this.consume(
          stream,
          decoder.decode(this.buffer.subarray(8, 8 + size), { stream: true }),
        ),
      );
      this.buffer = this.buffer.subarray(8 + size);
    }
    return entries;
  }

  flush(): LogEntry[] {
    const output: LogEntry[] = [];
    for (const stream of ["stdout", "stderr"] as const) {
      if (this.lineBuffers[stream])
        output.push(this.entry(stream, this.lineBuffers[stream]));
      this.lineBuffers[stream] = "";
    }
    return output;
  }

  private consume(stream: LogStream, text: string): LogEntry[] {
    const lines = (this.lineBuffers[stream] + text).split("\n");
    this.lineBuffers[stream] = lines.pop() ?? "";
    return lines.map((line) => this.entry(stream, line.replace(/\r$/, "")));
  }

  private entry(stream: LogStream, value: string): LogEntry {
    const match = value.match(timestampPattern);
    return {
      id: `${this.containerId}-${Date.now()}-${this.sequence++}`,
      containerId: this.containerId,
      stream,
      timestamp: match?.[1],
      message: match?.[2] ?? value,
    };
  }
}
