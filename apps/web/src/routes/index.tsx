import { createFileRoute } from "@tanstack/react-router";
import { LogsPage } from "@/pages/logs/LogsPage";

export const Route = createFileRoute("/")({ component: LogsPage });
