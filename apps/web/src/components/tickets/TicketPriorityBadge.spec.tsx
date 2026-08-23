import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TicketPriorityBadge } from "./TicketPriorityBadge";

describe("TicketPriorityBadge", () => {
  it("should render LOW priority", () => {
    render(<TicketPriorityBadge priority="LOW" />);
    expect(screen.getByText("LOW")).toBeInTheDocument();
  });

  it("should render MEDIUM priority", () => {
    render(<TicketPriorityBadge priority="MEDIUM" />);
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
  });

  it("should render HIGH priority", () => {
    render(<TicketPriorityBadge priority="HIGH" />);
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("should render URGENT priority", () => {
    render(<TicketPriorityBadge priority="URGENT" />);
    expect(screen.getByText("URGENT")).toBeInTheDocument();
  });

  it("should render as a span element", () => {
    render(<TicketPriorityBadge priority="LOW" />);
    const badge = screen.getByText("LOW");
    expect(badge.tagName).toBe("SPAN");
  });

  it("should have rounded-full class", () => {
    render(<TicketPriorityBadge priority="LOW" />);
    const badge = screen.getByText("LOW");
    expect(badge.className).toContain("rounded-full");
  });

  it("should have priority-specific styling for HIGH", () => {
    render(<TicketPriorityBadge priority="HIGH" />);
    const badge = screen.getByText("HIGH");
    expect(badge.className).toContain("orange");
  });

  it("should have priority-specific styling for URGENT", () => {
    render(<TicketPriorityBadge priority="URGENT" />);
    const badge = screen.getByText("URGENT");
    expect(badge.className).toContain("red");
  });

  it("should have priority-specific styling for MEDIUM", () => {
    render(<TicketPriorityBadge priority="MEDIUM" />);
    const badge = screen.getByText("MEDIUM");
    expect(badge.className).toContain("yellow");
  });
});
