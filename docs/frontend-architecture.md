# Frontend Architecture

## Overview

The AI Support Desk frontend is a Next.js 16 application located in `apps/web/`. It provides the support agent dashboard for creating, listing, and viewing tickets, including the visualization of asynchronous AI analysis results.

This document defines the folder structure, responsibilities, naming conventions, and data-fetching patterns used by the frontend.

---

## Guiding Principles

1. **Do not mirror the backend's Clean Architecture literally.** Next.js App Router already provides a natural structure. The frontend is organized around pages, reusable UI, and feature-specific logic rather than domain/application/infrastructure layers.

2. **Keep routing thin.** The `app/` directory contains route definitions and minimal page orchestration. Business logic and heavy UI live elsewhere.

3. **Colocate by feature.** Everything specific to tickets (types, API calls, hooks, utilities) lives under `features/tickets/`. This scales better than global `services/`, `hooks/`, and `types/` folders.

4. **Reuse generic UI.** Components such as `Button`, `Input`, and `Badge` live in `components/ui/` and are not tied to any feature.

5. **Abstract the HTTP client.** Only `lib/api/client.ts` reads `NEXT_PUBLIC_API_URL`. Feature API modules build on top of it.

---

## Directory Structure

```text
apps/web/src/
|
├── app/                          # Next.js App Router (routing only)
│   ├── layout.tsx                # Root layout, fonts, metadata
│   ├── page.tsx                  # Redirects to /tickets
│   ├── globals.css               # Tailwind CSS theme variables
│   └── tickets/
│       ├── page.tsx              # /tickets — ticket list
│       ├── new/
│       │   └── page.tsx          # /tickets/new — create ticket form
│       └── [id]/
│           └── page.tsx          # /tickets/:id — ticket detail
│
├── components/                   # Reusable React components
│   ├── layout/
│   │   ├── Header.tsx            # Top navigation bar
│   │   └── Sidebar.tsx           # (future) side navigation
│   │
│   ├── tickets/
│   │   ├── TicketList.tsx        # Ticket list container
│   │   ├── TicketCard.tsx        # Individual ticket card/row
│   │   ├── TicketStream.tsx      # SSE client for real-time updates
│   │   ├── TicketStatusBadge.tsx # Status badge
│   │   └── TicketPriorityBadge.tsx # Priority badge
│   │
│   └── ui/
│       ├── Button.tsx            # Generic button
│       ├── Input.tsx             # Generic input
│       └── Badge.tsx             # Generic badge
│
├── features/                     # Feature-specific logic
│   └── tickets/
│       ├── api/
│       │   └── tickets.api.ts    # Ticket API functions
│       ├── hooks/
│       │   ├── use-tickets.ts    # Hook for ticket list
│       │   └── use-ticket.ts     # Hook for single ticket
│       ├── types/
│       │   └── ticket.types.ts   # Ticket domain types
│       └── utils/
│           └── ticket.utils.ts   # Ticket helpers (formatting, etc.)
│
├── lib/                          # Shared infrastructure/helpers
│   ├── api/
│   │   └── client.ts             # Generic fetch wrapper
│   └── utils.ts                  # Class-name merger, general utilities
│
├── types/                        # Global types
│   └── api.types.ts              # Shared API types (ApiError, etc.)
│
└── config/
    └── env.ts                    # Environment variable access
```

---

## Layer Responsibilities

### 1. `app/` — Routing

`app/` is responsible only for routing and page entry points. Each `page.tsx` should be small and delegate to components and features.

**Example:**

```tsx
// app/tickets/page.tsx
import { TicketList } from '@/components/tickets/TicketList';

export default function TicketsPage() {
  return (
    <main>
      <TicketList />
    </main>
  );
}
```

Rules:
- Keep data fetching in Server Components when possible.
- Use Client Components (`'use client'`) only for interactivity (forms, buttons with side effects, etc.).
- Do not import HTTP clients or business logic directly here.

---

### 2. `components/` — Reusable UI

Components are divided by concern:

| Folder | Purpose |
|--------|---------|
| `components/layout/` | Application shell (Header, Sidebar) |
| `components/tickets/` | Domain-specific UI for tickets |
| `components/ui/` | Generic, reusable UI primitives |

Rules:
- Use **PascalCase** for component file names: `Header.tsx`, `TicketList.tsx`.
- UI primitives should be unopinionated about features. `Button` should not know about tickets.
- Feature components can import UI primitives.

---

### 3. `features/` — Feature Logic

Each feature owns its own API calls, hooks, types, and utilities. This keeps related code together and avoids global folders that grow indefinitely.

```text
features/tickets/
├── api/tickets.api.ts        # All ticket API calls
├── hooks/use-tickets.ts      # React hook for listing tickets
├── hooks/use-ticket.ts       # React hook for a single ticket
├── types/ticket.types.ts     # Ticket, TicketStatus, etc.
└── utils/ticket.utils.ts     # Formatters and helpers
```

Rules:
- A feature imports from `lib/` but `lib/` should not import from features.
- Types that are only used by a feature stay in `features/<feature>/types/`.
- Only truly global types belong in `src/types/`.

---

### 4. `lib/` — Shared Infrastructure

`lib/` contains code that any page, component, or feature might need.

```text
lib/
├── api/client.ts             # Generic fetch wrapper
└── utils.ts                  # cn() helper, general utilities
```

**`lib/api/client.ts` example:**

```typescript
import { env } from '@/config/env';

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${env.apiUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
```

Rules:
- `lib/api/client.ts` is the only place that reads `NEXT_PUBLIC_API_URL`.
- Do not call `fetch` directly from components or pages.

---

### 5. `types/` — Global Types

Use `src/types/` only for types shared across multiple features.

**Example:**

```typescript
// types/api.types.ts
export interface ApiError {
  message: string;
  statusCode: number;
}
```

Feature-specific types belong in `features/<feature>/types/`.

---

### 6. `config/` — Configuration

Centralize environment access in `config/env.ts`.

```typescript
// config/env.ts
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
};
```

Rules:
- Never read `process.env` directly in components or features.
- Always provide sensible defaults for development.

---

## Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| React component files | PascalCase | `TicketList.tsx` |
| Non-component TS files | kebab-case | `tickets.api.ts` |
| React hooks | camelCase with `use-` prefix file | `use-tickets.ts` exposes `useTickets()` |
| Types/interfaces | PascalCase | `Ticket`, `TicketStatus` |
| Feature folders | kebab-case | `tickets/`, `customers/` |
| Path alias | `@/*` maps to `src/*` | `@/components/layout/Header` |

---

## Data Fetching Patterns

### Server Components (default)

Most pages use Server Components and call feature API functions directly.

```tsx
// components/tickets/TicketList.tsx (Server Component)
import { getTickets } from '@/features/tickets/api/tickets.api';

export async function TicketList() {
  const tickets = await getTickets();

  return (
    <ul>
      {tickets.map((ticket) => (
        <li key={ticket.id}>{ticket.title}</li>
      ))}
    </ul>
  );
}
```

### Client Components with Hooks

Use hooks when you need interactivity, polling, or form submission.

```tsx
'use client';

import { useTickets } from '@/features/tickets/hooks/use-tickets';

export function TicketListClient() {
  const { tickets, isLoading, error } = useTickets();

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {tickets.map((ticket) => (
        <li key={ticket.id}>{ticket.title}</li>
      ))}
    </ul>
  );
}
```

### Form Submission

Forms use Client Components and call feature API functions on submit.

```tsx
'use client';

import { createTicket } from '@/features/tickets/api/tickets.api';

export function CreateTicketForm() {
  async function handleSubmit(formData: FormData) {
    await createTicket({
      customerId: formData.get('customerId') as string,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
    });
  }

  return <form action={handleSubmit}>...</form>;
}
```

### Server-Sent Events (SSE) for Real-Time Updates

For real-time updates without polling, use a headless Client Component with the browser-native `EventSource` API.

```tsx
// components/tickets/TicketStream.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { env } from "@/config/env";

export function TicketStream() {
  const router = useRouter();

  useEffect(() => {
    const eventSource = new EventSource(`${env.apiUrl}/events/tickets/stream`);

    eventSource.addEventListener("ticket.updated", () => {
      router.refresh();
    });

    eventSource.onerror = () => {
      console.error("SSE connection error");
    };

    return () => {
      eventSource.close();
    };
  }, [router]);

  return null;
}
```

**Usage in pages:**

```tsx
// app/tickets/page.tsx
import { TicketStream } from "@/components/tickets/TicketStream";

export default function TicketsPage() {
  return (
    <>
      <TicketStream />  {/* Invisible, listens for updates */}
      <TicketList />
    </>
  );
}
```

**How it works:**

1. `TicketStream` renders nothing (`return null`) — it is a headless component
2. `EventSource` opens a persistent HTTP connection to the SSE endpoint
3. When the backend emits a `ticket.updated` event, the listener fires
4. `router.refresh()` re-fetches all Server Components on the current page
5. Next.js re-renders the page with fresh data from the API

**Key points:**
- The SSE connection is per-tab — each open tab maintains its own connection
- `EventSource` automatically reconnects if the connection drops
- The backend SSE endpoint uses `text/event-stream` content type
- The event name in the SSE stream must match `addEventListener("ticket.updated", ...)`

---

## State Management

For the current scope, the frontend relies on:

- **Server Components** for initial data loads.
- **React hooks (`useState`, `useEffect`)** for local component state and simple client-side data fetching.
- **No global state library** (Redux, Zustand, etc.) is required at this stage.

As the app grows, consider introducing:

- **React Query / TanStack Query** for caching, polling, and synchronization.
- **Server Actions** (Next.js) for form submissions if you want to reduce client-side JavaScript.

---

## Handling Asynchronous AI State

Tickets move from `PROCESSING` to `ANALYZED` asynchronously. The frontend handles this with Server-Sent Events (SSE):

1. After creating a ticket, the dashboard shows the ticket with status `PROCESSING`.
2. The detail page shows AI fields as missing or with a dash (`—`).
3. When AI processing completes, the backend emits a `ticket.updated` event via SSE.
4. The `TicketStream` component receives the event and calls `router.refresh()`.
5. Next.js re-fetches the Server Components, and the page updates automatically.
6. Status badges use distinct colors to communicate state clearly.

No manual refresh is required. The update appears in near-real-time (<1 second from AI completion).

---

## Current vs. Target Structure

The project is transitioning from a flat scaffold to the feature-based structure described above.

**Current structure:**

```text
src/
├── app/
├── components/
│   ├── layout/header.tsx
│   └── tickets/
│       ├── ticket-status-badge.tsx
│       └── ticket-priority-badge.tsx
├── lib/
│   ├── api.ts
│   └── utils.ts
└── types/
    └── ticket.ts
```

**Target structure:**

```text
src/
├── app/
├── components/
│   ├── layout/Header.tsx
│   ├── tickets/TicketList.tsx
│   └── ui/Button.tsx
├── features/tickets/
│   ├── api/tickets.api.ts
│   ├── hooks/use-tickets.ts
│   └── types/ticket.types.ts
├── lib/api/client.ts
├── types/api.types.ts
└── config/env.ts
```

Migration steps:
1. Create `config/env.ts` and update all `process.env` reads to use it.
2. Move `lib/api.ts` to `lib/api/client.ts` as a generic `apiClient`.
3. Create `features/tickets/api/tickets.api.ts` wrapping `apiClient`.
4. Move `types/ticket.ts` to `features/tickets/types/ticket.types.ts`.
5. Rename components to PascalCase and split pages into smaller components.
6. Add hooks under `features/tickets/hooks/` for client-side data fetching.

---

## Relationship with Backend Architecture

```text
Next.js Frontend
      |
      | HTTP (fetch via apiClient)
      ▼
NestJS API
      |
      ├── Commands → CommandBus → CreateTicketHandler
      ├── Queries  → QueryBus  → GetTicketHandler / ListTicketsHandler
      └── SSE      → TicketEventsController → EventEmitter2
                                        ↑
                                        │
                              AnalyzeTicketHandler (emits after AI completes)
```

The frontend treats the backend as a black-box API. It does not replicate Clean Architecture layers because Next.js already provides a page-and-component model that is sufficient for the current scope.

For real-time updates, the frontend uses the browser-native `EventSource` API to subscribe to the SSE endpoint. The `TicketStream` component handles this transparently.

---

## Best Practices

1. **Prefer Server Components.** They reduce client-side JavaScript and simplify data fetching.
2. **Keep Client Components small.** Use them only for interactivity.
3. **Do not call `fetch` directly.** Always go through `lib/api/client.ts` or feature API functions.
4. **Colocate types with features.** Avoid a global `types/` dump.
5. **Use Tailwind for styling.** Avoid inline styles and custom CSS unless necessary.
6. **Handle loading and error states.** Every data fetch should have a clear UX for loading, empty, and error scenarios.
7. **Use `cache: 'no-store'` for dynamic data.** Tickets can change state asynchronously, so fresh data is important.

---

## See Also

- [Development Guide](development-guide.md) — Setup, commands, and frontend testing
- [Architecture](architecture.md) — Backend Clean Architecture and boundaries
- [System Overview](system-overview.md) — End-to-end system flow
- [Development Plan](development-plan.md) — Frontend roadmap and priorities
