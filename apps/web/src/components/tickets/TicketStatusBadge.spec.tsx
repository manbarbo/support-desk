import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TicketStatusBadge } from "./TicketStatusBadge";

describe("TicketStatusBadge", () => {
  it("should render OPEN status", () => {
    render(<TicketStatusBadge status="OPEN" />);
    expect(screen.getByText("OPEN")).toBeInTheDocument();
  });

  it("should render PROCESSING status", () => {
    render(<TicketStatusBadge status="PROCESSING" />);
    expect(screen.getByText("PROCESSING")).toBeInTheDocument();
  });

  it("should render ANALYZED status", () => {
    render(<TicketStatusBadge status="ANALYZED" />);
    expect(screen.getByText("ANALYZED")).toBeInTheDocument();
  });

  it("should render FAILED status", () => {
    render(<TicketStatusBadge status="FAILED" />);
    expect(screen.getByText("FAILED")).toBeInTheDocument();
  });

  it("should render RESOLVED status", () => {
    render(<TicketStatusBadge status="RESOLVED" />);
    expect(screen.getByText("RESOLVED")).toBeInTheDocument();
  });

  it("should render as a span element", () => {
    render(<TicketStatusBadge status="OPEN" />);
    const badge = screen.getByText("OPEN");
    expect(badge.tagName).toBe("SPAN");
  });

  it("should have rounded-full class", () => {
    render(<TicketStatusBadge status="OPEN" />);
    const badge = screen.getByText("OPEN");
    expect(badge.className).toContain("rounded-full");
  });

  it("should have status-specific styling for PROCESSING", () => {
    render(<TicketStatusBadge status="PROCESSING" />);
    const badge = screen.getByText("PROCESSING");
    expect(badge.className).toContain("yellow");
  });

  it("should have status-specific styling for ANALYZED", () => {
    render(<TicketStatusBadge status="ANALYZED" />);
    const badge = screen.getByText("ANALYZED");
    expect(badge.className).toContain("green");
  });

  it("should have status-specific styling for FAILED", () => {
    render(<TicketStatusBadge status="FAILED" />);
    const badge = screen.getByText("FAILED");
    expect(badge.className).toContain("red");
  });
});
