# Architecture

## Overview

AI Support Desk uses a layered architecture based on Clean Architecture principles.

The main objective is to keep business rules independent from infrastructure concerns such as:

- PostgreSQL
- Supabase
- RabbitMQ
- OpenCode
- HTTP
- external SDKs

The architecture is organized into four primary layers:

```text
Presentation
     │
     ▼
Application
     │
     ▼
Domain
     ▲
     │
Infrastructure
```

Infrastructure implements contracts defined by the inner layers.

---

# Layers

## Presentation

Responsible for communication with external clients.

Responsibilities:

- HTTP controllers
- Request validation
- DTOs
- HTTP response mapping
- Authentication boundaries when required

Example:

```text
TicketsController
TicketEventsController (SSE)
DLQController
```

Presentation should not contain business logic.

---

## Application

Coordinates application use cases.

Responsibilities:

- Commands
- Queries
- Command handlers
- Query handlers
- Application services
- AI agent orchestration

Examples:

```text
CreateTicketHandler
AnalyzeTicketHandler
GetTicketHandler
ListTicketsHandler
SupportAgent
TicketEventEmitterService
```

The application layer depends on domain abstractions.

---

## Domain

Contains the business model.

Examples:

```text
Ticket
TicketStatus
TicketPriority
TicketCategory
TicketSentiment
TicketAnalysis
DomainEvent
TicketCreatedEvent
TicketUpdatedEvent
```

The domain should remain independent from infrastructure.

It must not depend directly on:

```text
Supabase
RabbitMQ
OpenCode
PostgreSQL drivers
HTTP frameworks
```

---

## Infrastructure

Contains implementations for external systems.

Examples:

```text
SupabaseTicketRepository
RabbitMQMessagePublisher
RabbitMQConsumer
RabbitMQConnection
RabbitMQTopology
RabbitMQRetry
OpenCodeAdapter
SupportAgent
WinstonLoggerService
```

Infrastructure implements interfaces defined by the application or domain layers.

---

# Dependency Direction

The dependency rule is:

```text
┌──────────────────────┐
│    Presentation      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│     Application      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│       Domain         │
└──────────────────────┘
           ▲
           │
┌──────────┴───────────┐
│    Infrastructure    │
└──────────────────────┘
```

Infrastructure may depend on domain contracts.

Domain must not depend on infrastructure implementations.

---

# CQRS

The application uses CQRS to separate state-changing operations from read operations.

## Commands

Commands represent intentions that modify application state.

Examples:

```text
CreateTicketCommand
AnalyzeTicketCommand
UpdateTicketCommand
```

Flow:

```text
Controller
    │
    ▼
CommandBus
    │
    ▼
CommandHandler
    │
    ▼
Domain
    │
    ▼
Repository
    │
    ▼
Supabase
```

---

## Queries

Queries retrieve application state.

Examples:

```text
GetTicketQuery
ListTicketsQuery
```

Flow:

```text
Controller
    │
    ▼
QueryBus
    │
    ▼
QueryHandler
    │
    ▼
Repository
    │
    ▼
Supabase
```

The current implementation uses Supabase for both reads and writes.

CQRS provides logical separation without introducing unnecessary operational complexity.

---

# Event-Driven Architecture

The system uses two event channels for different purposes:

## 1. RabbitMQ (Cross-Process Async Events)

RabbitMQ handles async processing between services. When a ticket is created:

```text
CreateTicketHandler
        │
        ├──────────────► Supabase
        │
        └──────────────► RabbitMQ
                              │
                              ▼
                       ticket.created
                              │
                              ▼
                         AI Consumer
```

The HTTP request is therefore independent from AI processing.

## 2. EventEmitter2 (In-Process Real-Time Events)

When AI processing completes, an in-process event bridges the gap between async processing and SSE streaming to the frontend:

```text
AnalyzeTicketHandler
        │
        ├──────────────► Supabase (status: ANALYZED)
        │
        └──────────────► EventEmitter2.emit('ticket.updated')
                              │
                              ▼
                     TicketEventsController
                              │
                              ▼
                       SSE Stream
                              │
                              ▼
                  Frontend EventSource
                              │
                              ▼
                       router.refresh()
```

This two-stage design keeps concerns separated:
- **RabbitMQ** handles scalable, durable, cross-process async processing
- **EventEmitter2** handles lightweight, in-process real-time notifications to connected clients

---

# RabbitMQ

RabbitMQ acts as the message broker.

## Exchange

```text
support.events
```

The exchange distributes domain/application events using routing keys.

Example:

```text
ticket.created
```

is routed to:

```text
ticket.ai.processing
```

---

## Message Lifecycle

```text
Producer
   │
   ▼
Exchange
   │
   ▼
Queue
   │
   ▼
Consumer
   │
   ├── Success ──► ACK
   │
   └── Failure
          │
          ▼
        Retry
          │
          ▼
       Failure
          │
          ▼
         DLQ
```

---

# Retry Strategy

Transient failures should be retried with exponential backoff.

Examples:

- AI provider timeout
- Network failure
- Temporary provider error
- Temporary database failure

Retry flow:

```text
Main Queue
    │
    ▼
Consumer
    │
    ├── Success → ACK
    │
    └── Failure
          │
          ▼
    Retry Queue (with TTL)
          │
          │ TTL expires
          ▼
    Main Queue (requeued)
```

After the configured retry limit, the message is routed to the Dead Letter Queue.

This prevents a permanently failing message from continuously blocking the queue.

---

# DLQ Management

Administrative endpoints allow inspecting and reprocessing failed messages without accessing RabbitMQ directly.

## Endpoints

```text
GET    /admin/dlq                       → List messages
GET    /admin/dlq/:messageId            → Get message details
POST   /admin/dlq/:messageId/reprocess  → Reprocess one message
POST   /admin/dlq/reprocess-all         → Reprocess all messages
DELETE /admin/dlq/:messageId            → Delete a message
```

## Architecture

```text
DLQController
      │
      ▼
DLQManagementService
      │
      ▼
RabbitMQDLQService
      │
      ├── listMessages()     → get + nack (peek)
      ├── reprocessMessage() → get + publish to main queue + ack
      └── deleteMessage()    → get + ack (remove)
```

---

# AI Processing

AI processing occurs outside the HTTP request lifecycle.

```text
Ticket
  │
  ▼
RabbitMQ
  │
  ▼
AI Consumer
  │
  ▼
SupportAgent
  │
  ├── TicketClassifierTool
  ├── PriorityAnalyzerTool
  ├── SentimentAnalyzerTool
  └── ResponseGeneratorTool
  │
  ▼
TicketAnalysis
  │
  ▼
Supabase
```

---

# AI Provider Boundary

The application depends on:

```typescript
interface AIProvider {
  analyzeTicket(ticket: Ticket): Promise<TicketAnalysis>;
}
```

Infrastructure provides:

```text
OpenCodeAdapter
```

The domain and application layers do not depend on the OpenCode SDK.

## AI Response Validation

OpenCode responses are validated using Zod schemas at the adapter level:

```typescript
const OpenCodeResponseSchema = z.object({
  category: z.enum(['ORDER', 'BILLING', 'TECHNICAL', 'ACCOUNT', 'GENERAL']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'FRUSTRATED', 'ANGRY']),
  confidence: z.number().min(0).max(1),
  suggestedResponse: z.string().min(1),
});
```

This ensures:
- Runtime validation (not just compile-time)
- Descriptive error messages on invalid responses
- Type-safe data passed to Agent Tools

---

# AI Agent

The support agent uses specialized tools.

```text
SupportAgent
     │
     ├── TicketClassifierTool
     ├── PriorityAnalyzerTool
     ├── SentimentAnalyzerTool
     └── ResponseGeneratorTool
```

Each tool follows a common contract.

```typescript
interface AgentTool {
  name: string;

  execute(input: AgentToolInput): Promise<AgentToolOutput>;
}
```

This allows tools to be added without modifying the agent's core orchestration logic.

---

# Ticket State

Tickets move through a defined lifecycle:

```text
OPEN
 │
 ▼
PROCESSING
 │
 ├───────────────┐
 ▼               ▼
ANALYZED        FAILED
 │
 ▼
RESOLVED
```

The domain controls valid state transitions.

Invalid transitions produce domain errors.

---

# Persistence

Supabase provides PostgreSQL persistence.

The application interacts with persistence through repositories.

```text
Application
     │
     ▼
TicketRepository
     ▲
     │
     ▼
SupabaseTicketRepository
     │
     ▼
Supabase PostgreSQL
```

The repository translates between persistence models and domain models where necessary.

---

# Consistency Model

Ticket creation and AI analysis are intentionally separated.

A newly created ticket may temporarily exist in:

```text
PROCESSING
```

until the asynchronous AI worker finishes.

This is an eventual consistency boundary.

The frontend should represent this state explicitly.

---

# Failure Boundaries

The system contains several independent failure boundaries:

```text
HTTP
 │
 ▼
Application
 │
 ├── Database
 │
 └── RabbitMQ
        │
        ▼
      AI Worker
        │
        ▼
    AI Provider
```

Failures in AI processing should not cause the initial ticket creation request to fail after the ticket has been persisted.

---

# Module Organization

The backend uses NestJS modules to organize concerns:

```text
AppModule
├── ConfigModule (global)
├── EventEmitterModule (global, in-process events)
├── GlobalCqrsModule (global)
├── LoggerModule (global, structured logging)
├── InfrastructureModule
│   ├── AIModule
│   │   ├── OpenCodeAdapter
│   │   ├── SupportAgent
│   │   └── AgentTools
│   ├── MessagingModule
│   │   ├── RabbitMQModule (generic broker abstraction)
│   │   │   ├── RabbitMQConnection
│   │   │   ├── RabbitMQTopology
│   │   │   ├── RabbitMQMessagePublisher
│   │   │   ├── RabbitMQConsumer
│   │   │   ├── RabbitMQRetry
│   │   │   └── RabbitMQDLQService
│   │   ├── TicketCreatedConsumer
│   │   └── Messaging Types (broker-agnostic interfaces)
│   └── DatabaseModule
│       ├── SupabaseService
│       └── SupabaseTicketRepository
├── Controllers
│   ├── TicketsController
│   ├── TicketEventsController (SSE)
│   └── DLQController (admin)
└── Application Services
    ├── TicketEventEmitterService
    └── DLQManagementService
```

## Messaging Module Architecture

The messaging system is divided into two layers:

**1. RabbitMQModule (Generic)**
- Implements broker-specific logic
- Can be replaced with Kafka, SQS, etc.
- Exports generic interfaces (MessageQueueConfig, MessageExchangeConfig)

**2. MessagingModule (Application-Specific)**
- Uses generic messaging interfaces
- Contains application-specific consumers (TicketCreatedConsumer)
- Configures queues and exchanges for the application

This separation allows changing the message broker without modifying application logic.

---

# Logger Architecture

The logging system follows the same abstraction principle as messaging. Application and Domain layers depend on a `Logger` interface, while Infrastructure contains the Winston implementation.

## Abstraction

```text
Application / Domain
        │
        ▼
    Logger interface
        │
        ▼
WinstonLoggerService
        │
        ▼
   Winston Config
        │
        ├── Console
        ├── Error logs (daily rotate)
        └── Combined logs (daily rotate)
```

## Interface

```typescript
export const LOGGER = Symbol('LOGGER');

export type LogMetadata = Record<string, unknown>;

export interface Logger {
  debug(message: string, metadata?: LogMetadata): void;
  info(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  error(message: string, metadata?: LogMetadata): void;
}
```

## Usage

```typescript
constructor(@Inject(LOGGER) private readonly logger: Logger) {}

this.logger.info('Ticket created', {
  context: 'CreateTicketHandler',
  ticketId: ticket.id,
});
```

## Benefits

- Application/Domain never imports Winston
- Winston can be replaced with Pino, Bunyan, etc. without changing business logic
- Structured metadata for observability
- Consistent log format across the application

---

# Frontend Architecture

The frontend is a Next.js 16 application in `apps/web/`. It is intentionally **not** organized as a Clean Architecture mirror of the backend. Instead, it uses the natural structure provided by Next.js App Router:

```text
app/           → Routing pages
components/    → Reusable UI (layout, tickets, ui primitives)
features/      → Feature-specific logic (api, hooks, types, utils)
lib/           → Shared infrastructure (HTTP client, utilities)
types/         → Global types
config/        → Environment variables
```

## Frontend/Backend Boundary

```text
Next.js Frontend
      |
      | HTTP (REST + JSON)
      ▼
NestJS API — TicketsController
      |
      ├── CommandBus → CreateTicketCommand
      └── QueryBus   → GetTicketQuery / ListTicketsQuery
```

The frontend treats the backend as a black-box HTTP API. It does not import domain entities, command classes, or repository interfaces from the backend. Communication happens exclusively through the REST endpoints exposed by the Presentation layer.

## Why Not Clean Architecture in the Frontend?

- Next.js App Router already separates routing (`app/`), UI (`components/`), and infrastructure concerns naturally.
- The frontend's complexity does not yet justify domain/application/infrastructure layers.
- Feature-based colocation (`features/tickets/`) scales better than global `services/`, `hooks/`, and `types/` folders.

See [Frontend Architecture](frontend-architecture.md) for detailed conventions.

---

# Server-Sent Events (SSE)

The system uses SSE to push real-time ticket status updates from the backend to the frontend.

## SSE Endpoint

```text
GET /events/tickets/stream
```

Returns a `text/event-stream` response that remains open. Events are pushed when ticket status changes (e.g., from `PROCESSING` to `ANALYZED`).

## Backend Components

```text
AnalyzeTicketHandler
        │
        ▼
TicketEventEmitterService.emitTicketUpdated()
        │
        ▼
EventEmitter2.emit('ticket.updated')
        │
        ▼
TicketEventsController (SSE Observable)
        │
        ▼
HTTP Response: text/event-stream
```

## Frontend Component

```text
TicketStream (Client Component)
        │
        ▼
EventSource('/events/tickets/stream')
        │
        ▼
addEventListener('ticket.updated')
        │
        ▼
router.refresh() → re-fetch Server Components
```

The `TicketStream` component renders nothing visible. It connects to the SSE endpoint and calls `router.refresh()` when an event is received, causing Next.js to re-fetch Server Component data.

---

# Architectural Constraints

The following constraints should be preserved:

1. Domain logic must remain independent of infrastructure.
2. Commands and queries must remain separated.
3. RabbitMQ must handle asynchronous AI processing.
4. AI providers must be accessed through abstractions.
5. Persistence must be accessed through repositories.
6. External SDKs must remain inside infrastructure.
7. Business rules must not be implemented in controllers.
8. Infrastructure implementations must be replaceable.
9. Tests must be able to run without requiring real external AI calls.
10. New infrastructure dependencies should not be introduced without a clear requirement.
11. Real-time updates must use SSE with in-process EventEmitter2, not direct RabbitMQ-to-frontend connections.
12. Logging must use the `Logger` interface (`@Inject(LOGGER)`), not Winston directly.
