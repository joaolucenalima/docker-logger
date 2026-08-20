import { Button } from "@docker-logger/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { Circle, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getContainers } from "@/entities/container/container.api";
import { getLogs } from "@/entities/log/log.api";
import { useLogStore } from "@/entities/log/log.store";
import { useLogFilters } from "@/features/filter-logs/useLogFilters";
import { useLogStream } from "@/features/live-logs/useLogStream";
import { LogViewer } from "./LogViewer";

export function LogsPage() {
  const [containerId, setContainerId] = useState<string>();
  const [search, setSearch] = useState("");
  const [stdout, setStdout] = useState(true);
  const [stderr, setStderr] = useState(true);
  const containers = useQuery({
    queryKey: ["containers"],
    queryFn: getContainers,
    refetchInterval: 10_000,
  });
  const initialLogs = useQuery({
    queryKey: ["logs", containerId],
    queryFn: () => {
      if (!containerId) throw new Error("Selecione um container.");
      return getLogs(containerId);
    },
    enabled: Boolean(containerId),
  });
  const { logs, setLogs, status, clear } = useLogStore();
  const filteredLogs = useLogFilters(logs, search, stdout, stderr);

  useEffect(() => {
    if (!containerId && containers.data?.[0])
      setContainerId(containers.data[0].id);
  }, [containerId, containers.data]);
  useEffect(() => {
    if (initialLogs.data) setLogs(initialLogs.data);
  }, [initialLogs.data, setLogs]);
  useEffect(() => {
    if (containerId) clear();
  }, [clear, containerId]);
  useLogStream(containerId);

  const selected = containers.data?.find(
    (container) => container.id === containerId,
  );
  return (
    <main className="flex h-full min-h-0 flex-col gap-3 p-3">
      <section className="flex shrink-0 flex-wrap items-center gap-2 border border-zinc-800 bg-[#0c0f12] p-2">
        <div className="min-w-72 flex-1">
          <label htmlFor="container" className="sr-only">
            Container
          </label>
          <select
            id="container"
            value={containerId ?? ""}
            onChange={(event) => setContainerId(event.target.value)}
            disabled={containers.isLoading || Boolean(containers.error)}
            className="h-9 w-full border border-zinc-700 bg-[#090b0d] px-3 text-xs text-zinc-200 outline-none focus:border-cyan-400"
          >
            {!containers.data?.length && (
              <option value="">
                {containers.isLoading
                  ? "LOADING CONTAINERS..."
                  : "NO CONTAINERS AVAILABLE"}
              </option>
            )}
            {containers.data?.map((container) => (
              <option key={container.id} value={container.id}>
                {container.name} · {container.image} · {container.state}
              </option>
            ))}
          </select>
        </div>
        <div className="relative min-w-52 flex-1">
          <Search className="absolute top-2.5 left-3 size-3.5 text-zinc-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="SEARCH LOGS..."
            className="h-9 w-full border border-zinc-700 bg-[#090b0d] py-2 pr-3 pl-9 text-xs outline-none placeholder:text-zinc-600 focus:border-cyan-400"
          />
        </div>
        <FilterToggle
          active={stdout}
          onClick={() => setStdout(!stdout)}
          label="STDOUT"
        />
        <FilterToggle
          active={stderr}
          onClick={() => setStderr(!stderr)}
          label="STDERR"
          danger
        />
        <div className="flex items-center gap-2 border-zinc-800 border-l pl-2 text-[10px] text-zinc-500">
          <Circle
            className={`size-2 fill-current ${status === "connected" ? "text-cyan-400" : status === "connecting" ? "text-yellow-400" : "text-zinc-600"}`}
          />
          {status.toUpperCase()}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={clear}
          title="Limpar logs locais"
        >
          <Trash2 />
          CLEAR
        </Button>
      </section>
      <div className="flex shrink-0 items-center justify-between px-1 text-[10px] text-zinc-500 uppercase tracking-wider">
        <span>
          {selected
            ? `${selected.name} / ${selected.id.slice(0, 12)}`
            : "SELECT A CONTAINER"}
        </span>
        <span>{filteredLogs.length.toLocaleString()} entries</span>
      </div>
      {containers.error ? (
        <div className="grid flex-1 place-items-center border border-red-900/70 text-red-400 text-xs">
          {containers.error.message}
        </div>
      ) : (
        <LogViewer
          logs={filteredLogs}
          loading={Boolean(containerId) && initialLogs.isLoading}
          error={initialLogs.error?.message}
        />
      )}
    </main>
  );
}

function FilterToggle({
  active,
  onClick,
  label,
  danger,
}: {
  active: boolean;
  onClick(): void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 border px-3 font-medium text-[10px] ${active ? (danger ? "border-red-900 bg-red-950/40 text-red-300" : "border-cyan-800 bg-cyan-950/40 text-cyan-300") : "border-zinc-800 bg-transparent text-zinc-600"}`}
    >
      {label}
    </button>
  );
}
