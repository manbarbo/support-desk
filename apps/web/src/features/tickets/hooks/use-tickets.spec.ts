import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTickets } from "./use-tickets";
import type { Ticket } from "../types/ticket.types";

vi.mock("@/features/tickets/api/tickets.api", () => ({
  getTickets: vi.fn(),
}));

import { getTickets } from "@/features/tickets/api/tickets.api";

const mockGetTickets = vi.mocked(getTickets);

const mockTicket: Ticket = {
  id: "1",
  customerId: "customer-1",
  title: "Ticket 1",
  description: "Description",
  status: "PROCESSING",
  createdAt: "2026-08-23T10:00:00.000Z",
  updatedAt: "2026-08-23T10:00:00.000Z",
};

describe("useTickets", () => {
  beforeEach(() => {
    mockGetTickets.mockClear();
  });

  it("should return empty tickets initially", () => {
    mockGetTickets.mockResolvedValue([]);

    const { result } = renderHook(() => useTickets());

    expect(result.current.tickets).toEqual([]);
  });

  it("should set isLoading to true initially", () => {
    mockGetTickets.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTickets());

    expect(result.current.isLoading).toBe(true);
  });

  it("should return tickets after loading", async () => {
    const mockTickets: Ticket[] = [
      { ...mockTicket, id: "1", title: "Ticket 1" },
      { ...mockTicket, id: "2", title: "Ticket 2" },
    ];
    mockGetTickets.mockResolvedValue(mockTickets);

    const { result } = renderHook(() => useTickets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tickets).toEqual(mockTickets);
  });

  it("should set isLoading to false after loading", async () => {
    mockGetTickets.mockResolvedValue([]);

    const { result } = renderHook(() => useTickets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should set error when API fails", async () => {
    mockGetTickets.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useTickets());

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error?.message).toBe("Network error");
  });

  it("should pass filters to getTickets", async () => {
    mockGetTickets.mockResolvedValue([]);

    renderHook(() => useTickets({ status: "ANALYZED" }));

    expect(mockGetTickets).toHaveBeenCalledWith({ status: "ANALYZED" });
  });

  it("should clear error on successful reload", async () => {
    mockGetTickets
      .mockRejectedValueOnce(new Error("Fail"))
      .mockResolvedValueOnce([{ ...mockTicket, id: "1" }]);

    const { result, rerender } = renderHook(
      ({ filters }) => useTickets(filters),
      { initialProps: { filters: undefined as Record<string, string> | undefined } },
    );

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    rerender({ filters: { status: "ANALYZED" } });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  it("should handle non-Error exceptions", async () => {
    mockGetTickets.mockRejectedValueOnce(new Error("string error"));

    const { result } = renderHook(() => useTickets());

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error?.message).toBe("string error");
  });
});
