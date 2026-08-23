import { Button } from "@docker-logger/ui/components/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@docker-logger/ui/components/combobox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@docker-logger/ui/components/input-group";
import { useQuery } from "@tanstack/react-query";
import { Circle, Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getContainers } from "@/entities/container/container.api";
import type { Container } from "@/entities/container/container.types";
import { getLogs } from "@/entities/log/log.api";
import { useLogStore } from "@/entities/log/log.store";
import { useLogFilters } from "@/features/filter-logs/useLogFilters";
import { useLogStream } from "@/features/live-logs/useLogStream";
import { useUrlState } from "@/hooks/useUrlState";
import { LogViewer } from "./LogViewer";

export function LogsPage() {
  const [containerId, setContainerId] = useUrlState("container");
  const [containerSearch, setContainerSearch] = useState("");
  const syncedContainerId = useRef<string>(undefined);
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
    if (
      containers.data?.[0] &&
      !containers.data.some((container) => container.id === containerId)
    )
      setContainerId(containers.data[0].id);
  }, [containerId, containers.data, setContainerId]);

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

  useEffect(() => {
    if (!selected || syncedContainerId.current === selected.id) return;

    syncedContainerId.current = selected.id;
    setContainerSearch(formatContainerLabel(selected));
  }, [selected]);

  return (
    <main className="flex h-full min-h-0 flex-col gap-3 p-3">
      <section className="flex shrink-0 flex-wrap items-center gap-2 border border-zinc-800 bg-[#0c0f12] p-2">
        <div className="min-w-72 flex-1">
          <label htmlFor="container" className="sr-only">
            Container
          </label>

          <Combobox
            items={containers.data ?? []}
            value={selected ?? null}
            inputValue={containerSearch}
            onInputValueChange={setContainerSearch}
            onValueChange={(container) => {
              if (container) setContainerId(container.id);
            }}
            itemToStringLabel={formatContainerLabel}
            itemToStringValue={(container) => container.id}
            isItemEqualToValue={(item, value) => item.id === value.id}
            disabled={containers.isLoading || Boolean(containers.error)}
          >
            <ComboboxInput
              id="container"
              placeholder={
                containers.isLoading
                  ? "LOADING CONTAINERS..."
                  : "SEARCH CONTAINERS..."
              }
              className={`${toolbarInputClassName} [&_button:hover]:bg-zinc-900 [&_button:hover]:text-zinc-200 [&_button]:text-zinc-500`}
            />
            <ComboboxContent className="border border-zinc-700 bg-[#0c0f12] text-zinc-300 shadow-black/40 shadow-xl ring-0">
              <ComboboxEmpty className="text-zinc-500">
                NO CONTAINERS FOUND
              </ComboboxEmpty>
              <ComboboxList>
                {(container) => (
                  <ComboboxItem
                    key={container.id}
                    value={container}
                    className="border-zinc-800 border-b text-zinc-400 last:border-b-0 data-highlighted:bg-zinc-900 data-selected:bg-zinc-900 data-highlighted:text-zinc-100 data-selected:text-zinc-100 **:data-[slot=combobox-item-indicator]:text-zinc-400"
                  >
                    <span className="truncate">
                      {container.name} · {container.image} · {container.state}
                    </span>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>

        <div className="min-w-52 flex-1">
          <InputGroup className={toolbarInputClassName}>
            <InputGroupAddon>
              <Search className="size-3.5 text-zinc-500" />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="SEARCH LOGS..."
            />
          </InputGroup>
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

function formatContainerLabel(container: Container) {
  return `${container.name} · ${container.image} · ${container.state}`;
}

const toolbarInputClassName =
  "h-9 border-zinc-700 bg-[#090b0d] text-zinc-200 shadow-none transition-colors has-[[data-slot=input-group-control]:focus-visible]:border-cyan-400 has-[[data-slot=input-group-control]:focus-visible]:ring-0 [&_input]:text-zinc-200 [&_input]:placeholder:text-zinc-600";

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
      className={`h-9 cursor-pointer border px-3 font-medium text-[10px] ${active ? (danger ? "border-red-900 bg-red-950/40 text-red-300" : "border-cyan-800 bg-cyan-950/40 text-cyan-300") : "border-zinc-800 bg-transparent text-zinc-600"}`}
    >
      {label}
    </button>
  );
}
