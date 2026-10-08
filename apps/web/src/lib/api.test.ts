import { expect, it, vi } from "vitest";
vi.mock("@/auth", () => ({ auth: async () => ({ user: { apiToken: "test-token" } }) }));
import { api, apiFetch } from "./api";

it("uses exactly one /api prefix for typed project calls", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);
  try {
    await api.api.projects.$get();
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).pathname).toBe("/api/projects");
  } finally {
    vi.unstubAllGlobals();
  }
});

it("preserves the prefix and authentication for untyped calls", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);
  try {
    await apiFetch("/projects");
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).pathname).toBe("/api/projects");
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(options.headers).get("authorization")).toBe("Bearer test-token");
  } finally {
    vi.unstubAllGlobals();
  }
});
