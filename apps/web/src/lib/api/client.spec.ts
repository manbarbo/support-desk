import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient } from "./client";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("apiClient", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call fetch with the correct URL", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1 }),
    });

    await apiClient("/tickets");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/tickets"),
      expect.any(Object),
    );
  });

  it("should prepend apiUrl to the endpoint", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await apiClient("/tickets");

    const url = mockFetch.mock.calls[0][0];
    expect(url).toMatch(/^http:\/\/localhost:3001\/tickets$/);
  });

  it("should set Content-Type header", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiClient("/tickets");

    const options = mockFetch.mock.calls[0][1];
    expect(options.headers).toEqual(
      expect.objectContaining({ "Content-Type": "application/json" }),
    );
  });

  it("should merge custom headers", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiClient("/tickets", {
      headers: { Authorization: "Bearer token123" },
    });

    const options = mockFetch.mock.calls[0][1];
    expect(options.headers).toEqual(
      expect.objectContaining({
        "Content-Type": "application/json",
        Authorization: "Bearer token123",
      }),
    );
  });

  it("should return parsed JSON", async () => {
    const mockData = { id: "123", title: "Test" };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await apiClient("/tickets/123");

    expect(result).toEqual(mockData);
  });

  it("should throw on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(apiClient("/tickets/999")).rejects.toThrow(
      "API request failed: 404",
    );
  });

  it("should throw on server error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(apiClient("/tickets")).rejects.toThrow(
      "API request failed: 500",
    );
  });

  it("should pass through options like method and body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "1" }),
    });

    await apiClient("/tickets", {
      method: "POST",
      body: JSON.stringify({ title: "New ticket" }),
    });

    const options = mockFetch.mock.calls[0][1];
    expect(options.method).toBe("POST");
    expect(options.body).toBe('{"title":"New ticket"}');
  });

  it("should propagate fetch errors", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    await expect(apiClient("/tickets")).rejects.toThrow("Network error");
  });
});
