import type { LogEntry } from "./log.types";

export async function getLogs(containerId: string): Promise<LogEntry[]> {
  const response = await fetch(
    `/api/containers/${encodeURIComponent(containerId)}/logs?tail=1000`,
  );
  if (!response.ok)
    throw new Error(
      (await response.json().catch(() => null))?.error ??
        "Não foi possível carregar os logs.",
    );
  return response.json();
}
