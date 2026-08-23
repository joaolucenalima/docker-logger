import { clearCache, layout, prepare } from "@chenglou/pretext";
import { Button } from "@docker-logger/ui/components/button";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLogStore } from "@/entities/log/log.store";
import type { LogEntry } from "@/entities/log/log.types";

const LOG_FONT =
  '12px "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const LOG_LINE_HEIGHT = 18;
const ROW_HORIZONTAL_PADDING = 24;
const ROW_FIXED_COLUMNS_WIDTH = 28 + 208;
const ROW_CHROME_HEIGHT = 9;
const DEFAULT_TEXT_WIDTH = 380;
const MAX_PREPARED_ENTRIES = 10_000;
const preparedCache = new Map<string, ReturnType<typeof prepare>>();

function getPrepared(message: string) {
  const cached = preparedCache.get(message);

  if (cached) return cached;

  if (preparedCache.size >= MAX_PREPARED_ENTRIES) {
    preparedCache.clear();
    clearCache();
  }

  const prepared = prepare(message, LOG_FONT, {
    whiteSpace: "pre-wrap",
    letterSpacing: 0,
  });
  preparedCache.set(message, prepared);
  return prepared;
}

function estimateRowHeight(message: string, contentWidth: number) {
  const text = layout(
    getPrepared(message),
    Math.max(1, contentWidth),
    LOG_LINE_HEIGHT,
  );
  const textHeight = Math.max(LOG_LINE_HEIGHT, text.height);

  return textHeight + ROW_CHROME_HEIGHT;
}

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
  const hasContent = !loading && !error && logs.length > 0;

  const [textWidth, setTextWidth] = useState(DEFAULT_TEXT_WIDTH);

  useLayoutEffect(() => {
    if (!hasContent) return;

    const element = parentRef.current;

    if (!element) {
      return;
    }

    const update = () => {
      setTextWidth(
        Math.max(
          1,
          element.clientWidth -
            ROW_HORIZONTAL_PADDING -
            ROW_FIXED_COLUMNS_WIDTH,
        ),
      );
    };
    const observer = new ResizeObserver(update);

    update();
    observer.observe(element);

    return () => observer.disconnect();
  }, [hasContent]);

  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    getItemKey: (index) => logs[index]?.id ?? index,
    estimateSize: (index) =>
      estimateRowHeight(logs[index]?.message ?? "", textWidth),
    overscan: 12,
  });

  useEffect(() => {
    if (isLive && logs.length)
      virtualizer.scrollToIndex(logs.length - 1, { align: "end" });
  }, [isLive, logs.length, virtualizer]);

  useLayoutEffect(() => {
    if (textWidth > 0) virtualizer.measure();
  }, [textWidth, virtualizer]);

  useEffect(() => {
    let active = true;

    document.fonts.ready.then(() => {
      if (!active) return;

      preparedCache.clear();
      clearCache();
      virtualizer.measure();
    });

    return () => {
      active = false;
    };
  }, [virtualizer]);

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
                      ? "wrap-break-word min-w-0 flex-1 whitespace-pre-wrap text-red-300"
                      : "wrap-break-word min-w-0 flex-1 whitespace-pre-wrap text-zinc-300"
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
