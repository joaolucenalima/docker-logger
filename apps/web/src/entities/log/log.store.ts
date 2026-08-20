import { create } from "zustand";
import type { ConnectionStatus, LogEntry } from "./log.types";

const MAX_LOGS = 10_000;
type LogState = {
  logs: LogEntry[];
  isLive: boolean;
  pendingCount: number;
  status: ConnectionStatus;
  setLogs(logs: LogEntry[]): void;
  appendMany(logs: LogEntry[]): void;
  setLive(isLive: boolean): void;
  setStatus(status: ConnectionStatus): void;
  clear(): void;
};

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  isLive: true,
  pendingCount: 0,
  status: "disconnected",
  setLogs: (logs) =>
    set({ logs: logs.slice(-MAX_LOGS), pendingCount: 0, isLive: true }),
  appendMany: (incoming) =>
    set((state) => ({
      logs: [...state.logs, ...incoming].slice(-MAX_LOGS),
      pendingCount: state.isLive ? 0 : state.pendingCount + incoming.length,
    })),
  setLive: (isLive) =>
    set((state) => ({ isLive, pendingCount: isLive ? 0 : state.pendingCount })),
  setStatus: (status) => set({ status }),
  clear: () => set({ logs: [], pendingCount: 0 }),
}));
