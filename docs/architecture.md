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

Ticket processing is event-driven.

When a ticket is created:

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
├── GlobalCqrsModule (global)
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
│   │   │   └── RabbitMQRetry
│   │   ├── TicketCreatedConsumer
│   │   └── Messaging Types (broker-agnostic interfaces)
│   └── DatabaseModule
│       ├── SupabaseService
│       └── SupabaseTicketRepository
└── Controllers
    ├── TicketsController
    └── DLQController
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
