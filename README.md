# AI Support Desk

AI-powered customer support platform for managing, analyzing, and responding to customer support tickets.

The platform combines ticket management with asynchronous AI processing to automatically classify tickets, determine priority and sentiment, and generate suggested responses for support agents.

## Features

- Customer support ticket management
- Ticket categorization (ORDER, BILLING, TECHNICAL, ACCOUNT, GENERAL)
- Automatic priority detection (LOW, MEDIUM, HIGH, URGENT)
- Sentiment analysis (POSITIVE, NEUTRAL, NEGATIVE, FRUSTRATED, ANGRY)
- AI-generated response suggestions
- Asynchronous AI processing
- Event-driven communication
- Broker-agnostic messaging abstraction (currently RabbitMQ)
- Retry mechanism with exponential backoff and Dead Letter Queue
- PostgreSQL persistence through Supabase
- CQRS-based application flow
- Clean Architecture
- AI Agent with specialized tools
- Web-based support dashboard (Next.js)

---

## Architecture Overview

```text
                         ┌─────────────────┐
                         │     Next.js     │
                         │  Support Desk   │
                         └────────┬────────┘
                                  │
                                  │ HTTP
                                  ▼
                         ┌─────────────────┐
                         │     NestJS      │
                         │       API       │
                         └────────┬────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                 Commands                    Queries
                    │                           │
                    ▼                           ▼
              Command Bus                   Query Bus
                    │                           │
                    ▼                           ▼
             Command Handlers            Query Handlers
                    │                           │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                             Supabase
                            PostgreSQL
                                  │
                                  ▲
                                  │
                             AI Results
                                  │
                         ┌────────┴────────┐
                         │                 │
                         │    RabbitMQ     │
                         │                 │
                         └────────┬────────┘
                                  │
                                  ▼
                           AI Consumer
                                  │
                                  ▼
                             SupportAgent
                                  │
                         ┌────────┼────────┐
                         ▼        ▼        ▼
                    Classify  Priority  Sentiment
                         │        │        │
                         └────────┼────────┘
                                  ▼
                        Generate Response
```

The API does not wait for AI processing to complete.

When a ticket is created, the API stores the ticket and publishes an event to RabbitMQ. The AI consumer processes the event and performs the analysis asynchronously.

---

## Ticket Processing Flow

```text
User
 │
 ▼
Next.js
 │
 ▼
POST /tickets
 │
 ▼
CreateTicketHandler
 │
 ├──────────────► Supabase (status: PROCESSING)
 │
 └──────────────► RabbitMQ
                       │
                       ▼
                 TicketCreatedConsumer
                       │
                       ▼
                 AnalyzeTicketHandler
                       │
                       ▼
                  SupportAgent
                       │
              ┌────────┼────────┐
              ▼        ▼        ▼
         Classify  Priority  Sentiment
              │        │        │
              └────────┼────────┘
                       ▼
              Generate Response
                       │
                       ▼
                  Supabase (status: ANALYZED)
```

A newly created ticket has the following state:

```json
{
  "status": "PROCESSING"
}
```

Once AI processing completes:

```json
{
  "status": "ANALYZED",
  "priority": "HIGH",
  "category": "ORDER",
  "sentiment": "FRUSTRATED",
  "confidence": 0.94,
  "suggestedResponse": "We apologize for the delay..."
}
```

---

## Retry and Dead Letter Queue

The system implements a robust retry mechanism with exponential backoff:

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
          │ TTL expires (5s, 25s, 125s)
          ▼
    Main Queue (requeued)
          │
          └── After 3 retries
                │
                ▼
           Dead Letter Queue (DLQ)
```

Configuration:

```env
BROKER_MAX_RETRIES=3
BROKER_RETRY_BASE_DELAY=5000
```

### DLQ Management

Administrative endpoints for inspecting and reprocessing failed messages:

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/admin/dlq` | List messages in DLQ |
| `GET` | `/admin/dlq/:messageId` | Get message details |
| `POST` | `/admin/dlq/:messageId/reprocess` | Reprocess a message |
| `POST` | `/admin/dlq/reprocess-all` | Reprocess all messages |
| `DELETE` | `/admin/dlq/:messageId` | Delete a message |

---

# Technology Stack

## Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS

## Backend

- NestJS 11
- TypeScript
- NestJS CQRS

## Database

- Supabase
- PostgreSQL

## Messaging

- RabbitMQ 3 (with Management UI)

## AI

- OpenCode API
- Agent-based architecture with specialized tools

## Testing

- Jest

## Infrastructure

- Docker
- Docker Compose
- pnpm (monorepo)

---

# Project Structure

```text
ai-support-desk/
│
├── apps/
│   ├── api/                      # NestJS backend
│   │   └── src/
│   │       ├── domain/           # Business entities and interfaces
│   │       ├── application/      # Commands, queries, handlers, agents
│   │       ├── infrastructure/   # External implementations
│   │       └── presentation/     # HTTP controllers
│   │
│   └── web/                      # Next.js frontend
│       └── src/
│           ├── app/              # App Router pages
│           ├── components/       # Reusable UI components
│           │   ├── layout/       # Header, Sidebar
│           │   ├── tickets/      # Ticket-specific components
│           │   └── ui/           # Generic UI primitives
│           ├── features/         # Feature-specific logic
│           │   └── tickets/      # Ticket API, hooks, types
│           ├── lib/              # Shared helpers and API client
│           ├── types/            # Global types
│           └── config/           # Environment configuration
│
├── docs/
│   ├── architecture.md           # System architecture
│   ├── patterns.md               # Design patterns
│   ├── messaging.md              # RabbitMQ messaging system
│   └── development-plan.md       # Development roadmap
│
├── AGENTS.md                     # AI agent development rules
├── README.md
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

The backend follows Clean Architecture:

```text
api/src/
│
├── domain/
│   ├── entities/
│   │   ├── ticket.entity.ts
│   │   └── ticket-analysis.entity.ts
│   ├── enums/
│   │   ├── ticket-status.enum.ts
│   │   ├── ticket-priority.enum.ts
│   │   ├── ticket-category.enum.ts
│   │   └── ticket-sentiment.enum.ts
│   ├── events/
│   │   ├── domain-event.ts
│   │   ├── ticket-created.event.ts
│   │   └── message-publisher.interface.ts
│   └── repositories/
│       └── ticket.repository.ts
│
├── application/
│   ├── commands/
│   │   └── tickets/
│   │       ├── create-ticket.command.ts
│   │       ├── create-ticket.handler.ts
│   │       ├── analyze-ticket.command.ts
│   │       └── analyze-ticket.handler.ts
│   ├── queries/
│   │   └── tickets/
│   │       ├── get-ticket.query.ts
│   │       └── get-ticket.handler.ts
│   ├── ports/
│   │   ├── ai-provider.interface.ts
│   │   └── agent-tool.interface.ts
│   └── agents/
│       ├── support-agent.ts
│       └── tools/
│           ├── ticket-classifier.tool.ts
│           ├── priority-analyzer.tool.ts
│           ├── sentiment-analyzer.tool.ts
│           └── response-generator.tool.ts
│
├── infrastructure/
│   ├── ai/
│   │   ├── ai.module.ts
│   │   ├── opencode/
│   │   │   └── opencode.adapter.ts
│   │   └── tools/
│   │       ├── ticket-classifier.tool.ts
│   │       ├── priority-analyzer.tool.ts
│   │       ├── sentiment-analyzer.tool.ts
│   │       └── response-generator.tool.ts
│   ├── database/
│   │   ├── supabase.service.ts
│   │   └── supabase.types.ts
│   ├── messaging/
│   │   ├── messaging.module.ts
│   │   ├── messaging.types.ts        # Broker-agnostic interfaces
│   │   ├── messaging.config.ts       # Application-specific queue configs
│   │   ├── rabbitmq/
│   │   │   ├── rabbitmq.module.ts
│   │   │   ├── rabbitmq.connection.ts
│   │   │   ├── rabbitmq.topology.ts
│   │   │   ├── rabbitmq.publisher.ts
│   │   │   ├── rabbitmq.consumer.ts
│   │   │   └── rabbitmq.retry.ts
│   │   └── consumers/
│   │       └── ticket-created.consumer.ts
│   └── repositories/
│       └── supabase-ticket.repository.ts
│
└── presentation/
    └── controllers/
        └── tickets.controller.ts
```

---

# Database

Supabase provides the PostgreSQL persistence layer.

## Tickets

```text
tickets
├── id (UUID)
├── customer_id
├── title
├── description
├── status (OPEN, PROCESSING, ANALYZED, FAILED, RESOLVED)
├── priority (LOW, MEDIUM, HIGH, URGENT)
├── category (ORDER, BILLING, TECHNICAL, ACCOUNT, GENERAL)
├── sentiment (POSITIVE, NEUTRAL, NEGATIVE, FRUSTRATED, ANGRY)
├── confidence (0.0 - 1.0)
├── suggested_response
├── created_at
└── updated_at
```

---

# Messaging System

The system uses a broker-agnostic messaging abstraction that currently implements RabbitMQ. The abstraction layer allows switching to other message brokers (Kafka, SQS, etc.) without modifying application logic.

## Architecture

The messaging system is divided into two layers:

1. **RabbitMQModule (Generic)**: Implements broker-specific logic using generic interfaces
2. **MessagingModule (Application-Specific)**: Uses generic interfaces for application-specific consumers

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

These interfaces allow:
- **Broker Independence**: Application code doesn't depend on RabbitMQ-specific types
- **Flexibility**: Optional retry and DLQ configuration per queue
- **Replaceability**: Easy to switch to Kafka, SQS, or other brokers

## Current Implementation (RabbitMQ)

### Exchange

```text
support.events (topic)
```

### Routing Keys

```text
ticket.created
ticket.analyzed
ticket.responded
```

### Queues

```text
ticket.ai.processing           # Main processing queue
ticket.ai.processing.retry     # Retry queue with TTL
ticket.ai.processing.dlq       # Dead Letter Queue
```

### Retry Configuration

```env
BROKER_URL=amqp://guest:guest@localhost:5672
BROKER_MAX_RETRIES=3
BROKER_RETRY_BASE_DELAY=5000  # 5 seconds
```

Exponential backoff: 5s → 25s → 125s (max 5 minutes)

## Switching Brokers

To switch from RabbitMQ to another broker (e.g., Kafka):

1. Create a new broker module (e.g., `KafkaModule`)
2. Implement the same generic interfaces
3. Update `MessagingModule` to import the new broker module
4. No changes needed in consumers or business logic

See [docs/messaging.md](docs/messaging.md#switching-to-a-different-broker) for detailed instructions.

---

# AI Processing

The AI support agent analyzes incoming tickets using specialized tools.

## SupportAgent Architecture

```text
SupportAgent
     │
     ├── TicketClassifierTool      → Determines ticket category
     ├── PriorityAnalyzerTool      → Analyzes priority level
     ├── SentimentAnalyzerTool     → Detects customer sentiment
     └── ResponseGeneratorTool     → Generates response suggestion
```

Each tool implements:

```typescript
interface AgentTool {
  name: string;
  execute(input: AgentToolInput): Promise<AgentToolOutput>;
}
```

## AI Output Example

```json
{
  "category": "ORDER",
  "priority": "HIGH",
  "sentiment": "FRUSTRATED",
  "confidence": 0.94,
  "suggestedResponse": "We apologize for the delay in your order delivery. We understand this is frustrating and are actively working to resolve this issue. Your order is expected to arrive within the next 24-48 hours."
}
```

The AI provider is isolated behind an application-level abstraction (`AIProvider`), allowing the underlying provider to be replaced without modifying the ticket domain.

---

# Getting Started

## Requirements

Install the following:

- Node.js 18+
- pnpm 9+
- Docker
- Docker Compose
- Supabase project
- OpenCode API key

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
API_PORT=3001

# Supabase Cloud
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-secret-key

# RabbitMQ
BROKER_URL=amqp://guest:guest@localhost:5672
BROKER_MAX_RETRIES=3
BROKER_RETRY_BASE_DELAY=5000

# AI API
AI_API_KEY=your-opencode-api-key
AI_BASE_URL=https://opencode.ai/zen/go/v1
AI_MODEL=deepseek-v4-flash

# Web Configuration
WEB_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Do not commit environment files containing secrets.

---

## Install Dependencies

```bash
pnpm install
```

---

## Start Infrastructure

```bash
docker compose up -d
```

RabbitMQ Management UI:

```text
http://localhost:15672
```

Default development credentials:

```text
username: guest
password: guest
```

---

## Start the API

```bash
pnpm --filter api dev
```

The API is available at:

```text
http://localhost:3001
```

---

## Start the Web Application

```bash
pnpm --filter web dev
```

The frontend is available at:

```text
http://localhost:3000
```

---

# API

## Create Ticket

```http
POST /tickets
```

Example:

```json
{
  "customerId": "customer-123",
  "title": "My order has not arrived",
  "description": "My order was supposed to arrive five days ago."
}
```

Response:

```json
{
  "id": "ticket-uuid",
  "status": "PROCESSING",
  "customerId": "customer-123",
  "title": "My order has not arrived",
  "description": "My order was supposed to arrive five days ago.",
  "createdAt": "2026-08-22T10:00:00.000Z",
  "updatedAt": "2026-08-22T10:00:00.000Z"
}
```

---

## Get Ticket

```http
GET /tickets/:id
```

Response (after AI processing):

```json
{
  "id": "ticket-uuid",
  "status": "ANALYZED",
  "customerId": "customer-123",
  "title": "My order has not arrived",
  "description": "My order was supposed to arrive five days ago.",
  "priority": "HIGH",
  "category": "ORDER",
  "sentiment": "FRUSTRATED",
  "confidence": 0.94,
  "suggestedResponse": "We apologize for the delay...",
  "createdAt": "2026-08-22T10:00:00.000Z",
  "updatedAt": "2026-08-22T10:00:05.000Z"
}
```

---

## List Tickets

```http
GET /tickets
```

---

# Development

Run tests:

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm test:watch
```

Run tests with coverage:

```bash
pnpm test:cov
```

---

# Documentation

Comprehensive documentation is available in the `docs/` directory:

## Architecture & Design

- **[System Overview](docs/system-overview.md)** — Complete system flow, components, and architectural decisions
- **[Architecture](docs/architecture.md)** — Layered architecture, CQRS, event-driven design
- **[Frontend Architecture](docs/frontend-architecture.md)** — Next.js folder structure, data fetching, and conventions
- **[Design Patterns](docs/patterns.md)** — SOLID principles, patterns used, and refactoring decisions
- **[Messaging System](docs/messaging.md)** — Broker-agnostic messaging abstraction with RabbitMQ implementation

## Development

- **[Development Guide](docs/development-guide.md)** — Setup, running, testing, and troubleshooting
- **[Development Plan](docs/development-plan.md)** — Roadmap and implementation timeline
- **[AGENTS.md](AGENTS.md)** — AI agent development rules and constraints

## Quick Links

| Document | Description |
|----------|-------------|
| [System Overview](docs/system-overview.md) | Start here to understand the complete system |
| [Development Guide](docs/development-guide.md) | Setup and run the application locally |
| [Architecture](docs/architecture.md) | Understand the layered backend architecture |
| [Frontend Architecture](docs/frontend-architecture.md) | Next.js structure and conventions |
| [Messaging](docs/messaging.md) | Broker-agnostic messaging with RabbitMQ implementation |
| [Patterns](docs/patterns.md) | Design patterns and best practices |

---

# Design Patterns

This project demonstrates the following design patterns:

- **Clean Architecture**: Separation of concerns across layers
- **CQRS**: Command Query Responsibility Segregation
- **Repository Pattern**: Data access abstraction
- **Adapter Pattern**: External API isolation
- **Strategy Pattern**: Interchangeable algorithms
- **Event-Driven Architecture**: Asynchronous decoupling
- **Dependency Injection**: Loose coupling
- **Dead Letter Queue**: Resilient message processing
- **Agent Tool Pattern**: Modular AI capabilities
- **Broker Abstraction Pattern**: Message broker independence
- **Logger Abstraction**: Structured logging with swappable implementation
- **Interceptor Pattern**: Cross-cutting concerns (request/response logging)

See `docs/patterns.md` for detailed explanations.

---

# License

MIT
