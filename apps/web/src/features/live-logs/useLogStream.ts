import { useEffect } from "react";
import { useLogStore } from "@/entities/log/log.store";
import type { LogEntry } from "@/entities/log/log.types";

export function useLogStream(containerId?: string) {
  const appendMany = useLogStore((state) => state.appendMany);
  const setStatus = useLogStore((state) => state.setStatus);

  useEffect(() => {
    if (!containerId) return;
    const pending: LogEntry[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      timer = undefined;
      if (pending.length) appendMany(pending.splice(0));
    };
    setStatus("connecting");
    const source = new EventSource(
      `/api/containers/${encodeURIComponent(containerId)}/logs/stream`,
    );
    source.onopen = () => setStatus("connected");
    source.onmessage = (event) => {
      pending.push(JSON.parse(event.data) as LogEntry);
      if (!timer) timer = setTimeout(flush, 75);
    };
    source.onerror = () => setStatus("disconnected");
    return () => {
      source.close();
      if (timer) clearTimeout(timer);
      setStatus("disconnected");
    };
  }, [appendMany, containerId, setStatus]);
}
