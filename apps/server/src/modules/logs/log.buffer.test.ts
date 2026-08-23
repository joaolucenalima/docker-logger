import { describe, expect, test } from "bun:test";
import { LogBuffer } from "./log.buffer";

const log = (id: string) => ({
  id,
  containerId: "c",
  stream: "stdout" as const,
  message: id,
  plainMessage: id,
});

describe("LogBuffer", () => {
  test("descarta a entrada mais antiga ao atingir o limite", () => {
    const buffer = new LogBuffer(2);
    buffer.push(log("one"));
    buffer.push(log("two"));
    buffer.push(log("three"));
    expect(buffer.tail(10).map((entry) => entry.id)).toEqual(["two", "three"]);
  });
});
