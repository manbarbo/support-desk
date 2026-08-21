# Design Patterns & Principles

This document describes the architectural patterns used by AI Support Desk and their role within the system.

---

# SOLID

## Single Responsibility Principle

Each component should have one primary responsibility.

Example:

```text
CreateTicketHandler
    → Coordinates ticket creation

SupabaseTicketRepository
    → Handles ticket persistence

OpenCodeAdapter
    → Communicates with OpenCode

RabbitMQMessagePublisher
    → Publishes messages
```

A class should not simultaneously handle persistence, AI processing, messaging and HTTP concerns.

---

# Open/Closed Principle

Components should be open for extension while remaining closed for modification.

Example:

```text
AIProvider
    │
    ├── OpenCodeAdapter
    ├── MockAIAdapter
    └── FutureAIAdapter
```

Adding a new AI provider should not require modifying business logic.

---

# Liskov Substitution Principle

Implementations must be substitutable for their abstractions.

For example:

```text
AIProvider
   ▲
   │
   ├── OpenCodeAdapter
   └── MockAIAdapter
```

Both implementations must honor the behavior defined by `AIProvider`.

---

# Interface Segregation Principle

Interfaces should be small and focused.

Example:

```typescript
interface TicketRepository {
  create(ticket: Ticket): Promise<Ticket>;
  findById(id: string): Promise<Ticket | null>;
}
```

Instead of:

```typescript
interface SupportService {
  createTicket();
  updateTicket();
  deleteTicket();
  analyzeTicket();
  classifyTicket();
  generateResponse();
  sendEmail();
}
```

Focused interfaces make dependencies explicit and easier to test.

---

# Dependency Inversion Principle

High-level application logic depends on abstractions.

```text
CreateTicketHandler
        │
        ▼
TicketRepository
        ▲
        │
SupabaseTicketRepository
```

The application does not know which persistence technology is being used.

---

# Abstraction

Infrastructure capabilities are exposed through interfaces.

Example:

```typescript
interface AIProvider {
  analyzeTicket(ticket: Ticket): Promise<TicketAnalysis>;
}
```

The application interacts with the contract rather than the implementation.

---

# Polymorphism

Multiple implementations can be used through the same interface.

Example:

```text
AIProvider
   │
   ├── OpenCodeAdapter
   └── MockAIAdapter
```

The application can operate on `AIProvider` without knowing which concrete implementation is being used.

Another example:

```text
TicketClassificationStrategy
   │
   ├── AIClassificationStrategy
   └── RuleBasedClassificationStrategy
```

---

# Repository Pattern

The Repository Pattern isolates persistence from application logic.

```text
Application
     │
     ▼
TicketRepository
     ▲
     │
SupabaseTicketRepository
```

The repository exposes domain-oriented operations instead of database-specific APIs.

Example:

```typescript
interface TicketRepository {
  create(ticket: Ticket): Promise<Ticket>;

  findById(id: string): Promise<Ticket | null>;

  findAll(filters: TicketFilters): Promise<Ticket[]>;

  updateAnalysis(id: string, analysis: TicketAnalysis): Promise<void>;
}
```

---

# Adapter Pattern

The Adapter Pattern isolates third-party APIs.

The application defines:

```typescript
interface AIProvider {
  analyzeTicket(ticket: Ticket): Promise<TicketAnalysis>;
}
```

The infrastructure adapts OpenCode:

```text
Application
     │
     ▼
AIProvider
     ▲
     │
OpenCodeAdapter
     │
     ▼
OpenCode SDK
```

The external SDK therefore does not leak into the application layer.

---

# Strategy Pattern

Strategy allows interchangeable algorithms.

Example:

```typescript
interface TicketClassificationStrategy {
  classify(ticket: Ticket): Promise<TicketCategory>;
}
```

Implementations:

```text
TicketClassificationStrategy
          │
          ├── AIClassificationStrategy
          └── RuleBasedClassificationStrategy
```

This allows classification behavior to change without modifying the component that consumes the strategy.

---

# Factory Pattern

The Factory Pattern encapsulates the creation or selection of implementations.

Example:

```text
AIProviderFactory
       │
       ├── OpenCodeAdapter
       └── MockAIAdapter
```

The factory can select an implementation based on configuration or runtime requirements.

---

# Singleton

NestJS providers are singleton-scoped by default.

The project uses NestJS dependency injection to manage shared services instead of manually implementing global singleton state.

For example:

```typescript
@Injectable()
export class RabbitMQPublisher {}
```

NestJS manages the lifecycle of this provider.

A manual singleton should only be introduced if there is a specific requirement that cannot be satisfied through dependency injection.

---

# Dependency Injection

Dependencies are injected through constructors.

Example:

```typescript
constructor(
  private readonly repository: TicketRepository,
  private readonly publisher: MessagePublisher,
) {}
```

This provides:

- loose coupling
- easier testing
- replaceable implementations
- explicit dependencies

---

# CQRS

CQRS separates commands and queries.

```text
                 Application
                     │
             ┌───────┴───────┐
             │               │
         Commands          Queries
             │               │
             ▼               ▼
       Command Handlers  Query Handlers
             │               │
             ▼               ▼
          Mutations        Reads
```

Commands:

```text
CreateTicketCommand
AnalyzeTicketCommand
UpdateTicketCommand
```

Queries:

```text
GetTicketQuery
ListTicketsQuery
```

CQRS is used as a logical separation. A separate read database is not required.

---

# Event-Driven Architecture

The system uses events to decouple asynchronous processes.

Example:

```text
Ticket Created
      │
      ▼
RabbitMQ
      │
      ▼
AI Processor
```

The producer does not need to know the internal implementation of the consumer.

---

# Message Broker Pattern

RabbitMQ acts as the communication layer between producers and consumers.

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
```

This provides asynchronous processing and temporal decoupling.

---

# Dead Letter Queue

The Dead Letter Queue handles messages that cannot be successfully processed after the configured retry policy.

```text
Queue
  │
  ▼
Consumer
  │
  ├── Success → ACK
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

This provides a controlled failure path.

---

# Agent Tool Abstraction

AI agent capabilities are represented as tools.

```typescript
interface AgentTool {
  name: string;

  execute(input: AgentToolInput): Promise<AgentToolOutput>;
}
```

Possible tools:

```text
TicketClassifierTool
SentimentAnalyzerTool
PriorityAnalyzerTool
ResponseGeneratorTool
```

The abstraction allows new capabilities to be introduced without tightly coupling the agent to concrete implementations.

---

# Pattern Selection Guidelines

Patterns should only be introduced when they solve an actual design problem.

Use:

```text
Repository
→ persistence isolation

Adapter
→ external API isolation

Strategy
→ interchangeable algorithms

Factory
→ controlled implementation selection

CQRS
→ command/query separation

Dependency Injection
→ dependency inversion and testability

Event-driven architecture
→ asynchronous decoupling

Dead Letter Queue
→ controlled message failure handling
```

Avoid adding patterns solely to increase the number of patterns in the codebase.

---

# Architectural Relationship

The patterns work together rather than existing independently.

```text
                    Presentation
                         │
                         ▼
                       CQRS
                  ┌──────┴──────┐
                  ▼             ▼
              Commands       Queries
                  │             │
                  ▼             ▼
               Handlers      Handlers
                  │
                  ▼
               Domain
                  │
          ┌───────┼────────┐
          ▼       ▼        ▼
     Repository Strategy  AIProvider
          │                 │
          ▼                 ▼
      Supabase          Adapter
                             │
                             ▼
                          OpenCode

                  Commands
                     │
                     ▼
                  RabbitMQ
                     │
                     ▼
                 AI Worker
                     │
                     ▼
                  AI Agent
                     │
              ┌──────┼──────┐
              ▼      ▼      ▼
            Tools  Tools   Tools
```

The architecture therefore combines the patterns around clear responsibilities rather than treating them as isolated examples.
