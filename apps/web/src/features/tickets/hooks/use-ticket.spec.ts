import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTicket } from "./use-ticket";
import type { Ticket } from "../types/ticket.types";

vi.mock("@/features/tickets/api/tickets.api", () => ({
  getTicket: vi.fn(),
}));

import { getTicket } from "@/features/tickets/api/tickets.api";

const mockGetTicket = vi.mocked(getTicket);

const mockTicket: Ticket = {
  id: "ticket-123",
  customerId: "customer-1",
  title: "My Ticket",
  description: "Description",
  status: "PROCESSING",
  createdAt: "2026-08-23T10:00:00.000Z",
  updatedAt: "2026-08-23T10:00:00.000Z",
};

describe("useTicket", () => {
  beforeEach(() => {
    mockGetTicket.mockClear();
  });

  it("should return null ticket initially", () => {
    mockGetTicket.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTicket("ticket-123"));

    expect(result.current.ticket).toBeNull();
  });

  it("should set isLoading to true initially", () => {
    mockGetTicket.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTicket("ticket-123"));

    expect(result.current.isLoading).toBe(true);
  });

  it("should return ticket after loading", async () => {
    const mockTicketData: Ticket = { ...mockTicket, id: "ticket-123", title: "My Ticket" };
    mockGetTicket.mockResolvedValue(mockTicketData);

    const { result } = renderHook(() => useTicket("ticket-123"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.ticket).toEqual(mockTicket);
  });

  it("should set isLoading to false after loading", async () => {
    mockGetTicket.mockResolvedValue(mockTicket);

    const { result } = renderHook(() => useTicket("ticket-123"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should set error when API fails", async () => {
    mockGetTicket.mockRejectedValue(new Error("Not found"));

    const { result } = renderHook(() => useTicket("ticket-123"));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error?.message).toBe("Not found");
  });

  it("should pass the id to getTicket", async () => {
    mockGetTicket.mockResolvedValue({ ...mockTicket, id: "ticket-456" });

    renderHook(() => useTicket("ticket-456"));

    expect(mockGetTicket).toHaveBeenCalledWith("ticket-456");
  });

  it("should re-fetch when id changes", async () => {
    mockGetTicket.mockResolvedValue({ ...mockTicket, id: "ticket-1" });

    const { rerender } = renderHook(
      ({ id }) => useTicket(id),
      { initialProps: { id: "ticket-1" } },
    );

    await waitFor(() => {
      expect(mockGetTicket).toHaveBeenCalledWith("ticket-1");
    });

    mockGetTicket.mockResolvedValue({ ...mockTicket, id: "ticket-2" });
    rerender({ id: "ticket-2" });

    await waitFor(() => {
      expect(mockGetTicket).toHaveBeenCalledWith("ticket-2");
    });
  });

  it("should handle non-Error exceptions", async () => {
    mockGetTicket.mockRejectedValueOnce(new Error("string error"));

    const { result } = renderHook(() => useTicket("ticket-123"));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error?.message).toBe("string error");
  });
});
