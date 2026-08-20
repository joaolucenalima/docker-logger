import type { Container } from "./container.types";

export async function getContainers(): Promise<Container[]> {
  const response = await fetch("/api/containers");
  if (!response.ok)
    throw new Error(
      (await response.json().catch(() => null))?.error ??
        "Não foi possível listar os containers.",
    );
  return response.json();
}
