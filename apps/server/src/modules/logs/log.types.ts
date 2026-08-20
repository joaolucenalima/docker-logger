export type LogStream = "stdout" | "stderr";
export type LogEntry = {
  id: string;
  timestamp?: string;
  containerId: string;
  stream: LogStream;
  message: string;
};
