import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

export function useUrlState(key: string) {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate({ from: "/" });
  const value = typeof search[key] === "string" ? search[key] : undefined;

  const setValue = useCallback(
    (nextValue?: string) =>
      navigate({
        replace: true,
        search: (previous) => {
          const next = { ...previous };
          const nextValues = next as Record<string, unknown>;

          if (nextValue) nextValues[key] = nextValue;
          else delete nextValues[key];

          return next;
        },
      }),
    [key, navigate],
  );

  return [value, setValue] as const;
}
