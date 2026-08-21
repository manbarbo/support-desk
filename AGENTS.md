# AGENTS.md

## AI Support Desk — Development Instructions

This document defines the rules that AI coding agents must follow when working on this repository.

The agent must preserve the existing architecture, boundaries and design decisions while implementing new functionality.

---

# 1. Project Context

AI Support Desk is an AI-powered customer support platform built with:

- Next.js
- NestJS
- TypeScript
- Supabase/PostgreSQL
- RabbitMQ
- OpenCode

The backend uses Clean Architecture principles, CQRS and event-driven processing.

---

# 2. Primary Architectural Objectives

The implementation must preserve the following architectural characteristics:

- Abstraction
- Interfaces
- Polymorphism
- SOLID
- Clean Architecture
- CQRS
- Repository Pattern
- Adapter Pattern
- Strategy Pattern
- Factory Pattern
- Dependency Injection
- Singleton lifecycle through NestJS
- Event-Driven Architecture
- RabbitMQ messaging
- Asynchronous AI processing

These requirements are architectural constraints.

Do not remove an abstraction or pattern simply because a direct implementation appears shorter.

At the same time, do not introduce unnecessary abstractions that do not solve an actual architectural problem.

---

# 3. Required Documentation

Before making architectural changes, review:

```text
README.md
docs/architecture.md
docs/patterns.md
```

When changing an existing architectural decision, update the appropriate documentation.

---

# 4. Architecture

The backend follows:

```text
Presentation
     ↓
Application
     ↓
Domain
     ↑
Infrastructure
```

Dependencies must point toward the inner layers.

Infrastructure implements contracts defined by the inner layers.

---

# 5. Domain Rules

The domain must remain independent from infrastructure.

The following dependencies must not appear inside domain entities or domain services:

```text
Supabase SDK
RabbitMQ SDK
OpenCode SDK
PostgreSQL drivers
HTTP framework
```

The domain should contain business concepts such as:

```text
Ticket
TicketStatus
TicketPriority
TicketCategory
TicketAnalysis
```

---

# 6. SOLID Requirements

## Single Responsibility

Classes should have one primary responsibility.

Avoid large services that handle:

```text
database
AI
messaging
HTTP
business rules
```

simultaneously.

---

## Open/Closed

Prefer extension through interfaces and implementations.

Example:

```text
AIProvider
   ├── OpenCodeAdapter
   └── MockAIAdapter
```

Adding a provider should not require changing application business logic.

---

## Liskov Substitution

All implementations of an abstraction must respect its contract.

Do not create fake implementations that behave differently in ways that violate the abstraction.

---

## Interface Segregation

Prefer focused interfaces:

```text
TicketRepository
AIProvider
MessagePublisher
AgentTool
NotificationProvider
```

Avoid large interfaces containing unrelated responsibilities.

---

## Dependency Inversion

Application code must depend on abstractions.

Prefer:

```text
CreateTicketHandler
      ↓
TicketRepository
      ↑
SupabaseTicketRepository
```

Avoid:

```text
CreateTicketHandler
      ↓
SupabaseClient
```

---

# 7. CQRS

Use CQRS for application operations.

Commands modify state.

Examples:

```text
CreateTicketCommand
AnalyzeTicketCommand
UpdateTicketCommand
```

Queries retrieve state.

Examples:

```text
GetTicketQuery
ListTicketsQuery
```

Commands and queries must not be mixed inside the same handler.

Do not introduce separate read/write databases unless explicitly required.

---

# 8. Repository Pattern

Persistence must be abstracted.

Example:

```typescript
interface TicketRepository {
  create(ticket: Ticket): Promise<Ticket>;

  findById(id: string): Promise<Ticket | null>;

  findAll(filters: TicketFilters): Promise<Ticket[]>;
}
```

Supabase implementation belongs in infrastructure.

The application must not depend directly on Supabase APIs.

---

# 9. Adapter Pattern

External providers must be isolated through adapters.

AI integration must follow:

```text
AIProvider
     ▲
     │
OpenCodeAdapter
     │
     ▼
OpenCode SDK
```

Never import the OpenCode SDK into domain or application business logic.

---

# 10. AI Provider Abstraction

The preferred abstraction is:

```typescript
interface AIProvider {
  analyzeTicket(ticket: Ticket): Promise<TicketAnalysis>;
}
```

Possible implementations:

```text
OpenCodeAdapter
MockAIAdapter
```

The application must depend on `AIProvider`.

---

# 11. Polymorphism

Where multiple implementations satisfy the same contract, the consumer should depend on the abstraction.

Example:

```text
TicketClassificationStrategy
          │
          ├── AIClassificationStrategy
          └── RuleBasedClassificationStrategy
```

Avoid type-specific conditional logic such as:

```typescript
if (provider === 'OpenCode') {
   ...
}

if (provider === 'mock') {
   ...
}
```

when polymorphism can solve the problem more cleanly.

---

# 12. Strategy Pattern

Use Strategy when interchangeable algorithms or behaviors exist.

Example:

```typescript
interface TicketClassificationStrategy {
  classify(ticket: Ticket): Promise<TicketCategory>;
}
```

Implementations can include:

```text
AIClassificationStrategy
RuleBasedClassificationStrategy
```

Do not create strategies for behavior that has no realistic variation.

---

# 13. Factory Pattern

Use factories when implementation selection must be encapsulated.

Example:

```text
AIProviderFactory
      │
      ├── OpenCodeAdapter
      └── MockAIAdapter
```

Avoid factories that simply wrap a constructor without providing selection or creation logic.

---

# 14. Singleton and Dependency Injection

NestJS providers should use the framework's dependency injection lifecycle.

Providers are singleton-scoped by default.

Prefer:

```typescript
@Injectable()
export class RabbitMQPublisher {}
```

Avoid manually implementing static singleton state unless explicitly required.

The goal is to demonstrate Singleton lifecycle through NestJS's IoC container while maintaining testability.

---

# 15. RabbitMQ

RabbitMQ is the only message broker for this project.

Do not introduce:

```text
Redis
BullMQ
Kafka
SQS
```

unless explicitly requested.

---

# 16. RabbitMQ Topology

Use:

```text
Exchange:
support.events
```

Routing keys:

```text
ticket.created
ticket.analyzed
ticket.responded
```

Queues:

```text
ticket.ai.processing
ticket.notifications
ticket.ai.processing.dlq
```

---

# 17. Event-Driven AI Processing

Ticket creation must not synchronously wait for AI processing.

Preferred flow:

```text
CreateTicketCommand
       │
       ▼
CreateTicketHandler
       │
       ├──────► Supabase
       │
       └──────► RabbitMQ
                    │
                    ▼
             ticket.created
                    │
                    ▼
              AI Processor
                    │
                    ▼
                 AI Agent
                    │
                    ▼
                Supabase
```

The API should be able to return while AI processing is still running.

---

# 18. Message Handling

Consumers must:

1. Validate the message.
2. Process the message.
3. Acknowledge successful processing.
4. Retry transient failures.
5. Route permanently failed messages to the DLQ.

Never acknowledge a message before successful processing.

---

# 19. AI Agent

The AI agent should remain intentionally small.

The agent may use:

```text
TicketClassifierTool
SentimentAnalyzerTool
PriorityAnalyzerTool
ResponseGeneratorTool
```

Tools should implement:

```typescript
interface AgentTool {
  name: string;

  execute(input: AgentToolInput): Promise<AgentToolOutput>;
}
```

Do not implement a complex multi-agent architecture.

---

# 20. AI Processing Contract

AI output should be structured.

Expected conceptual result:

```typescript
interface TicketAnalysis {
  category: TicketCategory;
  priority: TicketPriority;
  sentiment: TicketSentiment;
  confidence: number;
  suggestedResponse: string;
}
```

Avoid returning unvalidated arbitrary AI text directly to the domain.

AI responses should be parsed and validated before persistence.

---

# 21. Database

Supabase/PostgreSQL is the persistence layer.

Expected core entities:

```text
tickets
ticket_analyses
messages
```

Database access belongs in infrastructure.

Do not access Supabase directly from:

```text
controllers
domain entities
command handlers
query handlers
```

Handlers should use repositories.

---

# 22. Frontend

Next.js is responsible for presentation.

The frontend must not implement backend business rules.

Frontend responsibilities:

- ticket forms
- ticket lists
- ticket details
- loading states
- processing states
- error presentation
- AI analysis visualization

Backend responsibilities:

- validation
- business rules
- persistence
- AI processing
- messaging
- domain state transitions

---

# 23. Testing

Business logic must be testable without external infrastructure.

Unit tests should use:

```text
MockTicketRepository
MockAIProvider
MockMessagePublisher
```

Real integrations should be reserved for integration tests.

Unit tests must not require:

```text
real Supabase
real RabbitMQ
real OpenCode API
```

---

# 24. Error Handling

Use explicit errors.

Examples:

```text
TicketNotFoundError
InvalidTicketStateError
AIProviderError
MessagePublishingError
```

Do not leak infrastructure-specific errors directly to API clients.

---

# 25. Code Quality

Prefer:

- TypeScript strict mode
- explicit types
- small classes
- focused interfaces
- dependency injection
- composition
- immutable data where appropriate
- meaningful names

Avoid:

- `any`
- god classes
- global mutable state
- duplicated business logic
- unnecessary abstractions
- unnecessary design patterns

---

# 26. Avoid Overengineering

The architecture must remain understandable.

Do not introduce:

- microservices
- Kubernetes
- event sourcing
- separate read databases
- vector databases
- complex RAG
- multi-agent orchestration
- GraphQL without a requirement
- WebSockets without a requirement
- unnecessary authentication systems
- additional brokers

unless explicitly requested.

---

# 27. Architectural Decision Rule

When choosing between two implementations:

1. Prefer the one that preserves architectural boundaries.
2. Prefer abstractions at external system boundaries.
3. Prefer dependency injection over manual construction.
4. Prefer composition over inheritance.
5. Prefer simple implementations over unnecessary complexity.
6. Preserve existing patterns when extending the system.
7. Do not introduce a pattern solely for the sake of having another pattern.

---

# 28. Definition of Done

A feature is complete when:

- It respects Clean Architecture boundaries.
- SOLID principles remain intact.
- CQRS responsibilities are preserved.
- Infrastructure remains replaceable.
- External providers are behind abstractions.
- RabbitMQ is used for asynchronous processing where required.
- Business logic has tests.
- No secrets are committed.
- Existing tests pass.
- Documentation is updated when architecture changes.

---

# 29. Priority Order

When requirements conflict, use this priority:

```text
1. Correctness
2. Existing architectural boundaries
3. Domain/business rules
4. SOLID principles
5. Testability
6. Simplicity
7. Performance optimization
```

Do not sacrifice architectural boundaries merely to reduce the amount of code.

---

# 30. Final Principle

The system should remain:

```text
Simple
   +
Decoupled
   +
Testable
   +
Replaceable
   +
Understandable
```

The purpose of the architecture is to make future changes easier without introducing unnecessary complexity.
