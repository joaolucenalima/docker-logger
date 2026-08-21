import { createFileRoute } from "@tanstack/react-router";
import { LogsPage } from "@/pages/logs/LogsPage";

type LogsSearch = {
  container?: string;
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): LogsSearch =>
    typeof search.container === "string" ? { container: search.container } : {},
  component: LogsPage,
});
