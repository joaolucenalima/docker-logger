import { QueryClient } from "@tanstack/react-query";

// REST and SSE are the public API for this MVP. This shared client only
// provides TanStack Query's cache to the application shell.
export const queryClient = new QueryClient();
