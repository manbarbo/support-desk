# AI Support Desk

AI-powered customer support platform for managing, analyzing, and responding to customer support tickets.

The platform combines ticket management with asynchronous AI processing to automatically classify tickets, determine priority and sentiment, and generate suggested responses for support agents.

## Features

- Customer support ticket management
- Ticket categorization
- Automatic priority detection
- Sentiment analysis
- AI-generated response suggestions
- Asynchronous AI processing
- Event-driven communication
- RabbitMQ message broker
- Retry and Dead Letter Queue processing
- PostgreSQL persistence through Supabase
- CQRS-based application flow
- Web-based support dashboard

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
                           AI Processor
                                  │
                                  ▼
                             AI Agent
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

When a ticket is created, the API stores the ticket and publishes an event to RabbitMQ. The AI processor consumes the event and performs the analysis asynchronously.

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
Create Ticket
 │
 ├──────────────► Supabase
 │
 └──────────────► RabbitMQ
                       │
                       ▼
                 AI Processor
                       │
                       ▼
                  AI Analysis
                       │
                       ▼
                    Supabase
                       │
                       ▼
                  Ticket Updated
```

A newly created ticket can initially have the following state:

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
  "sentiment": "FRUSTRATED"
}
```

---

# Technology Stack

## Frontend

- Next.js
- React
- TypeScript

## Backend

- NestJS
- TypeScript
- NestJS CQRS

## Database

- Supabase
- PostgreSQL

## Messaging

- RabbitMQ

## AI

- OpenCode API

## Testing

- Jest

## Infrastructure

- Docker
- Docker Compose

---

# Project Structure

```text
ai-support-desk/
│
├── apps/
│   ├── api/
│   │   └── src/
│   │
│   └── web/
│       └── app/
│
├── docs/
│   ├── architecture.md
│   └── patterns.md
│
├── AGENTS.md
├── README.md
├── docker-compose.yml
└── package.json
```

The backend follows a Clean Architecture-inspired organization:

```text
api/src/
│
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

---

# Database

Supabase provides the PostgreSQL persistence layer.

## Tickets

```text
tickets
├── id
├── customer_id
├── title
├── description
├── status
├── priority
├── category
├── created_at
└── updated_at
```

## Ticket Analyses

```text
ticket_analyses
├── id
├── ticket_id
├── category
├── priority
├── sentiment
├── confidence
├── suggested_response
└── created_at
```

## Messages

```text
messages
├── id
├── ticket_id
├── role
├── content
└── created_at
```

---

# RabbitMQ

RabbitMQ is used to process ticket-related operations asynchronously.

## Exchange

```text
support.events
```

## Routing Keys

```text
ticket.created
ticket.analyzed
ticket.responded
```

## Queues

```text
ticket.ai.processing
ticket.notifications
ticket.ai.processing.dlq
```

---

# AI Processing

The AI support agent analyzes incoming tickets and generates structured information.

Example:

```json
{
  "category": "ORDER",
  "priority": "HIGH",
  "sentiment": "FRUSTRATED",
  "confidence": 0.94,
  "suggestedResponse": "We apologize for the delay..."
}
```

The AI provider is isolated behind an application-level abstraction, allowing the underlying provider to be replaced without modifying the ticket domain.

---

# Getting Started

## Requirements

Install the following:

- Node.js
- pnpm
- Docker
- Docker Compose
- Supabase project
- OpenCode API key

---

## Environment Variables

Create the required environment configuration:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
DATABASE_URL=

BROKER_URL=amqp://guest:guest@localhost:5672

OpenCode_API_KEY=
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
  "id": "ticket-123",
  "status": "PROCESSING"
}
```

---

## List Tickets

```http
GET /tickets
```

---

## Get Ticket

```http
GET /tickets/:id
```

---

# Development

Run tests:

```bash
pnpm test
```

Run unit tests:

```bash
pnpm test:unit
```

Run integration tests:

```bash
pnpm test:integration
```

---

# Documentation

Additional architecture documentation is available in:

- `docs/architecture.md` — system architecture and application flows
- `docs/patterns.md` — design patterns and architectural principles
- `AGENTS.md` — development rules and architectural constraints

---

# License

MIT
