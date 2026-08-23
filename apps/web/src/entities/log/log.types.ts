export type LogEntry = {
  id: string;
  timestamp?: string;
  containerId: string;
  stream: "stdout" | "stderr";
  message: string;
  plainMessage: string;
};
export type ConnectionStatus = "connecting" | "connected" | "disconnected";
