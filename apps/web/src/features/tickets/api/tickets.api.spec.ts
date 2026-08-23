import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTickets, getTicket, createTicket } from "./tickets.api";

vi.mock("@/lib/api/client", () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from "@/lib/api/client";

const mockApiClient = vi.mocked(apiClient);

describe("tickets.api", () => {
  beforeEach(() => {
    mockApiClient.mockClear();
  });

  describe("getTickets", () => {
    it("should call apiClient with /tickets endpoint", async () => {
      mockApiClient.mockResolvedValue([]);

      await getTickets();

      expect(mockApiClient).toHaveBeenCalledWith("/tickets", {
        cache: "no-store",
      });
    });

    it("should append query params when filters provided", async () => {
      mockApiClient.mockResolvedValue([]);

      await getTickets({ status: "ANALYZED", priority: "HIGH" });

      const endpoint = mockApiClient.mock.calls[0][0] as string;
      expect(endpoint).toContain("/tickets?");
      expect(endpoint).toContain("status=ANALYZED");
      expect(endpoint).toContain("priority=HIGH");
    });

    it("should not append query params when no filters", async () => {
      mockApiClient.mockResolvedValue([]);

      await getTickets();

      expect(mockApiClient).toHaveBeenCalledWith("/tickets", {
        cache: "no-store",
      });
    });

    it("should return the tickets array", async () => {
      const mockTickets = [
        { id: "1", title: "Ticket 1" },
        { id: "2", title: "Ticket 2" },
      ];
      mockApiClient.mockResolvedValue(mockTickets);

      const result = await getTickets();

      expect(result).toEqual(mockTickets);
    });
  });

  describe("getTicket", () => {
    it("should call apiClient with the ticket id in the path", async () => {
      mockApiClient.mockResolvedValue({});

      await getTicket("ticket-123");

      expect(mockApiClient).toHaveBeenCalledWith("/tickets/ticket-123", {
        cache: "no-store",
      });
    });

    it("should return the ticket", async () => {
      const mockTicket = { id: "ticket-123", title: "My Ticket" };
      mockApiClient.mockResolvedValue(mockTicket);

      const result = await getTicket("ticket-123");

      expect(result).toEqual(mockTicket);
    });
  });

  describe("createTicket", () => {
    it("should call apiClient with POST method and body", async () => {
      mockApiClient.mockResolvedValue({});

      await createTicket({
        customerId: "customer-1",
        title: "New Ticket",
        description: "Description here",
      });

      expect(mockApiClient).toHaveBeenCalledWith("/tickets", {
        method: "POST",
        body: JSON.stringify({
          customerId: "customer-1",
          title: "New Ticket",
          description: "Description here",
        }),
      });
    });

    it("should return the created ticket", async () => {
      const mockTicket = { id: "new-123", title: "New Ticket" };
      mockApiClient.mockResolvedValue(mockTicket);

      const result = await createTicket({
        customerId: "customer-1",
        title: "New Ticket",
        description: "Description",
      });

      expect(result).toEqual(mockTicket);
    });
  });
});
