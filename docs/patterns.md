# Design Patterns & Principles

This document describes the architectural patterns used by AI Support Desk and their role within the system.

---

# SOLID

## Single Responsibility Principle

Each component should have one primary responsibility.

Examples:

```text
CreateTicketHandler
    → Coordinates ticket creation

SupabaseTicketRepository
    → Handles ticket persistence

OpenCodeAdapter
    → Communicates with OpenCode API

RabbitMQMessagePublisher
    → Publishes domain events

RabbitMQConsumer
    → Consumes messages from queues

RabbitMQRetry
    → Handles retry logic and DLQ

RabbitMQConnection
    → Manages RabbitMQ connection

SupportAgent
    → Orchestrates AI analysis tools

TicketClassifierTool
    → Classifies ticket category

PriorityAnalyzerTool
    → Analyzes ticket priority
```

A class should not simultaneously handle persistence, AI processing, messaging, and HTTP concerns.

---

## Open/Closed Principle

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

Example:

```text
AgentTool
    │
    ├── TicketClassifierTool
    ├── PriorityAnalyzerTool
    ├── SentimentAnalyzerTool
    ├── ResponseGeneratorTool
    └── FutureTool
```

Adding a new AI tool should not require modifying the SupportAgent.

---

## Liskov Substitution Principle

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

## Interface Segregation Principle

Interfaces should be small and focused.

Example:

```typescript
interface TicketRepository {
  create(ticket: Ticket): Promise<Ticket>;
  findById(id: string): Promise<Ticket | null>;
}

interface MessagePublisher {
  publish(event: DomainEvent): Promise<void>;
}

interface AIProvider {
  analyzeTicket(ticket: Ticket): Promise<TicketAnalysis>;
}

interface AgentTool {
  name: string;
  execute(input: AgentToolInput): Promise<AgentToolOutput>;
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
  publishMessage();
}
```

Focused interfaces make dependencies explicit and easier to test.

---

## Dependency Inversion Principle

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

```text
SupportAgent
        │
        ▼
AIProvider
        ▲
        │
OpenCodeAdapter
```

The agent does not know which AI provider is being used.

---

# Abstraction

Infrastructure capabilities are exposed through interfaces.

Examples:

```typescript
interface AIProvider {
  analyzeTicket(ticket: Ticket): Promise<TicketAnalysis>;
}

interface MessagePublisher {
  publish(event: DomainEvent): Promise<void>;
}

interface TicketRepository {
  create(ticket: Ticket): Promise<Ticket>;
  findById(id: string): Promise<Ticket | null>;
}
```

The application interacts with contracts rather than implementations.

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
AgentTool
   │
   ├── TicketClassifierTool
   ├── PriorityAnalyzerTool
   ├── SentimentAnalyzerTool
   └── ResponseGeneratorTool
```

The SupportAgent can execute any tool that implements `AgentTool`.

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
export class RabbitMQConnection {}
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
     Retry Queue (with TTL)
       │
       │ TTL expires
       ▼
     Main Queue (requeued)
       │
       └── After max retries
             │
             ▼
            DLQ
```

This provides a controlled failure path with exponential backoff.

---

# Broker Abstraction Pattern

The messaging system uses a broker-agnostic abstraction layer to decouple application logic from the specific message broker implementation.

## Generic Interfaces

```typescript
interface MessageQueueConfig {
  queue: string;
  routingKey: string;
  retryQueue?: string;
  deadLetterQueue?: string;
  durable?: boolean;
  autoDelete?: boolean;
}

interface MessageExchangeConfig {
  name: string;
  type: 'topic' | 'direct' | 'fanout' | 'headers';
  durable?: boolean;
  autoDelete?: boolean;
}
```

## Implementation

```text
Application Layer
       │
       ▼
MessageQueueConfig (generic interface)
       ▲
       │
RabbitMQModule (implementation)
       │
       ├── RabbitMQConnection
       ├── RabbitMQTopology
       ├── RabbitMQConsumer
       └── RabbitMQMessagePublisher
```

## Benefits

- **Broker Independence**: Application logic doesn't depend on RabbitMQ-specific types
- **Replaceability**: Can switch to Kafka, SQS, or other brokers by implementing new modules
- **Testability**: Easy to mock messaging interfaces in tests
- **Flexibility**: Different queues can have different configurations (with/without retry, DLQ)

## Example: Switching Brokers

To switch from RabbitMQ to Kafka:

1. Create `KafkaModule` implementing the same generic interfaces
2. Update `MessagingModule` to import `KafkaModule` instead of `RabbitMQModule`
3. No changes needed in `TicketCreatedConsumer` or other application code

---

# Agent Tool Abstraction

AI agent capabilities are represented as tools.

```typescript
interface AgentTool {
  name: string;

  execute(input: AgentToolInput): Promise<AgentToolOutput>;
}
```

Implemented tools:

```text
TicketClassifierTool
PriorityAnalyzerTool
SentimentAnalyzerTool
ResponseGeneratorTool
```

The abstraction allows new capabilities to be introduced without tightly coupling the agent to concrete implementations.

---

# Module Pattern (NestJS)

The system uses NestJS modules to organize concerns and manage dependencies.

```text
AppModule
├── InfrastructureModule
│   ├── AIModule
│   │   ├── OpenCodeAdapter
│   │   ├── SupportAgent
│   │   └── AgentTools
│   └── MessagingModule
│       ├── RabbitMQConnection
│       ├── RabbitMQTopology
│       ├── RabbitMQMessagePublisher
│       ├── RabbitMQConsumer
│       ├── RabbitMQRetry
│       └── TicketCreatedConsumer
```

Modules encapsulate related providers and expose only what's necessary through exports.

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

Module Pattern
→ organized dependency management
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
      Supabase          Agent
                             │
                      ┌──────┼──────┐
                      ▼      ▼      ▼
                    Tools  Tools   Tools
                             │
                             ▼
                        OpenCode
                        Adapter

                Commands
                   │
                   ▼
                RabbitMQ
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
       Publisher  Consumer  Retry
          │        │        │
          ▼        ▼        ▼
       Event    Command    DLQ
```

The architecture therefore combines the patterns around clear responsibilities rather than treating them as isolated examples.

---

# Refactoring Principles

The messaging system was refactored to improve separation of concerns:

## Before

```text
TicketCreatedConsumer
 ├── Connection management
 ├── Channel management
 ├── Exchange setup
 ├── Queue setup
 ├── Retry logic
 ├── Backoff calculation
 ├── DLQ handling
 ├── ACK/NACK
 └── Business logic
```

## After

```text
TicketCreatedConsumer
 └── Business logic only

RabbitMQConsumer
 └── Message consumption + error handling

RabbitMQConnection
 └── Connection management

RabbitMQTopology
 └── Infrastructure setup

RabbitMQRetry
 └── Retry logic + DLQ
```

This refactoring applies:

- **Single Responsibility**: Each class has one clear purpose
- **Separation of Concerns**: Infrastructure separated from business logic
- **Reusability**: Components can be reused for other consumers
- **Testability**: Each component can be tested in isolation
