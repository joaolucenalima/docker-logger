import { describe, expect, test } from "bun:test";
import { DockerLogParser } from "./log.parser";

function frame(stream: 1 | 2, message: string) {
  const body = Buffer.from(message);
  const header = Buffer.alloc(8);
  header[0] = stream;
  header.writeUInt32BE(body.length, 4);
  return Buffer.concat([header, body]);
}

describe("DockerLogParser", () => {
  test("separa stdout, stderr e timestamp", () => {
    const parser = new DockerLogParser("container-1");
    const entries = parser.push(
      Buffer.concat([
        frame(1, "2026-08-20T10:00:00.000Z started\n"),
        frame(2, "2026-08-20T10:00:01.000Z failed\n"),
      ]),
    );
    expect(entries).toMatchObject([
      {
        stream: "stdout",
        timestamp: "2026-08-20T10:00:00.000Z",
        message: "started",
      },
      { stream: "stderr", message: "failed" },
    ]);
  });

  test("reconstrói frame e linha fragmentados", () => {
    const parser = new DockerLogParser("container-1");
    const chunk = frame(1, "first half");
    expect(parser.push(chunk.subarray(0, 4))).toEqual([]);
    expect(parser.push(chunk.subarray(4))).toEqual([]);
    expect(parser.push(frame(1, " second\nsecond line\n"))).toMatchObject([
      { message: "first half second" },
      { message: "second line" },
    ]);
  });

  test("preserva caracteres UTF-8", () => {
    const parser = new DockerLogParser("container-1");
    expect(parser.push(frame(1, "olá, café ☕\n"))[0]).toMatchObject({
      message: "olá, café ☕",
    });
  });
});
