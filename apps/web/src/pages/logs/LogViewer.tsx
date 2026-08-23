import { Button } from "@docker-logger/ui/components/button";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLogStore } from "@/entities/log/log.store";
import type { LogEntry } from "@/entities/log/log.types";

export function LogViewer({
  logs,
  loading,
  error,
}: {
  logs: LogEntry[];
  loading: boolean;
  error?: string;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const { isLive, pendingCount, setLive } = useLogStore();

  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 26,
    overscan: 12,
  });

  useEffect(() => {
    if (isLive && logs.length)
      virtualizer.scrollToIndex(logs.length - 1, { align: "end" });
  }, [isLive, logs.length, virtualizer]);

  const onScroll = () => {
    const node = parentRef.current;
    if (!node) return;
    setLive(node.scrollHeight - node.scrollTop - node.clientHeight < 36);
  };

  if (loading)
    return (
      <div className="grid flex-1 place-items-center border border-zinc-800 text-xs text-zinc-500">
        LOADING LOGS...
      </div>
    );

  if (error)
    return (
      <div className="grid flex-1 place-items-center border border-red-900/70 text-red-400 text-xs">
        {error}
      </div>
    );

  if (!logs.length)
    return (
      <div className="grid flex-1 place-items-center border border-zinc-800 text-xs text-zinc-500">
        NO LOG ENTRIES
      </div>
    );

  return (
    <div className="relative min-h-0 flex-1 border border-zinc-800 bg-[#0c0f12]">
      <div
        ref={parentRef}
        onScroll={onScroll}
        className="scrollbar-thin h-full overflow-auto"
      >
        <div
          className="relative w-full"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((item) => {
            const log = logs[item.index];
            return (
              <div
                key={log.id}
                className="absolute top-0 left-0 flex w-full border-zinc-900 border-b px-3 py-1 text-xs leading-4.5 hover:bg-zinc-900/70"
                style={{ transform: `translateY(${item.start}px)` }}
              >
                <span className="w-7 shrink-0 text-cyan-400">
                  {log.stream === "stderr" ? "!" : ">"}
                </span>
                <span className="w-52 shrink-0 text-zinc-600">
                  {log.timestamp
                    ? new Date(log.timestamp).toLocaleString()
                    : "--"}
                </span>
                <span
                  className={
                    log.stream === "stderr"
                      ? "whitespace-pre-wrap break-all text-red-300"
                      : "whitespace-pre-wrap break-all text-zinc-300"
                  }
                >
                  {log.message}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {!isLive && (
        <Button
          className="absolute right-4 bottom-4"
          size="sm"
          onClick={() => {
            setLive(true);
            virtualizer.scrollToIndex(logs.length - 1, { align: "end" });
          }}
        >
          <ArrowDown />
          LIVE{pendingCount ? ` · ${pendingCount} NEW` : ""}
        </Button>
      )}
    </div>
  );
}
