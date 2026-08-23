import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { TicketStream } from "./TicketStream";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

// Mock EventSource
class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState = 0;
  static instances: MockEventSource[] = [];

  constructor(url: string) {
    this.url = url;
    this.readyState = 1;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === "ticket.updated") {
      this.onmessage = listener as any;
    }
  }

  close() {
    this.readyState = 2;
  }

  simulateEvent(data: string) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent("message", { data }));
    }
  }
}

vi.stubGlobal("EventSource", MockEventSource);

describe("TicketStream", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    mockRefresh.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render nothing", () => {
    const { container } = render(<TicketStream />);
    expect(container.innerHTML).toBe("");
  });

  it("should create an EventSource connection", () => {
    render(<TicketStream />);

    expect(MockEventSource.instances).toHaveLength(1);
  });

  it("should connect to the correct URL", () => {
    render(<TicketStream />);

    const instance = MockEventSource.instances[0];
    expect(instance.url).toContain("/events/tickets/stream");
  });

  it("should call router.refresh when ticket.updated event is received", () => {
    render(<TicketStream />);

    const instance = MockEventSource.instances[0];
    instance.simulateEvent(JSON.stringify({ ticketId: "123" }));

    expect(mockRefresh).toHaveBeenCalled();
  });

  it("should close EventSource on unmount", () => {
    const { unmount } = render(<TicketStream />);

    const instance = MockEventSource.instances[0];
    unmount();

    expect(instance.readyState).toBe(2);
  });

  it("should handle SSE errors gracefully", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<TicketStream />);

    const instance = MockEventSource.instances[0];
    if (instance.onerror) {
      instance.onerror(new Event("error"));
    }

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
