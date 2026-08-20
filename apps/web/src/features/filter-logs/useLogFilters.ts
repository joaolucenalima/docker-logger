import { useMemo } from "react";
import type { LogEntry } from "@/entities/log/log.types";

export function useLogFilters(
  logs: LogEntry[],
  search: string,
  stdout: boolean,
  stderr: boolean,
) {
  return useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return logs.filter(
      (log) =>
        (log.stream === "stdout" ? stdout : stderr) &&
        (!needle || log.message.toLocaleLowerCase().includes(needle)),
    );
  }, [logs, search, stderr, stdout]);
}
