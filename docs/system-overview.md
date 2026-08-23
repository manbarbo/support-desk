# System Overview

## Introduction

AI Support Desk is an intelligent customer support platform that automatically analyzes and categorizes support tickets using AI. The system processes tickets asynchronously, allowing for scalable and resilient handling of customer inquiries.

---

## System Components

### 1. Frontend (Next.js)

**Location**: `apps/web/`

**Responsibilities**:
- User interface for support agents
- Ticket creation and management
- Display of asynchronous AI analysis results
- Loading, empty, and error state handling

**Key Features**:
- Dashboard with ticket list (`/tickets`)
- Ticket creation form (`/tickets/new`)
- Ticket detail view with AI analysis (`/tickets/:id`)
- Status and priority indicators (PROCESSING, ANALYZED, HIGH, URGENT, etc.)

**Frontend Structure**:

The frontend is organized into thin pages, reusable components, and feature-specific logic:

```text
apps/web/src/
├── app/                  # Next.js routes
├── components/
│   ├── layout/           # Header, Sidebar
│   ├── tickets/          # TicketList, TicketCard, badges
│   └── ui/               # Button, Input, Badge
├── features/tickets/     # API, hooks, types, utilities
├── lib/api/              # Generic HTTP client
├── types/                # Global types
└── config/               # Environment variables
```

Pages remain small and delegate to components and features. Data fetching uses Next.js Server Components by default, with Client Components reserved for forms and interactivity.

See [Frontend Architecture](frontend-architecture.md) for the full conventions.

---

### 2. Backend API (NestJS)

**Location**: `apps/api/`

**Responsibilities**:
- HTTP API for ticket management
- Business logic orchestration
- Event publishing
- AI processing coordination

**Architecture**: Clean Architecture with 4 layers

```text
Presentation (Controllers)
    ↓
Application (Commands/Queries/Handlers)
    ↓
Domain (Entities/Interfaces)
    ↑
Infrastructure (Implementations)
```

---

### 3. Database (Supabase/PostgreSQL)

**Responsibilities**:
- Persistent storage of tickets
- Storage of AI analysis results
- Data integrity and consistency

**Key Tables**:
- `tickets` - Main ticket data with analysis results

---

### 4. Message Broker (RabbitMQ)

**Responsibilities**:
- Asynchronous event distribution
- Retry mechanism for failed processing
- Dead Letter Queue for permanent failures

**Key Components**:
- Exchange: `support.events`
- Queues: `ticket.ai.processing`, `ticket.ai.processing.retry`, `ticket.ai.processing.dlq`

---

### 5. AI Provider (OpenCode)

**Responsibilities**:
- Ticket classification
- Priority analysis
- Sentiment detection
- Response generation

**Integration**: Through `AIProvider` interface with `OpenCodeAdapter` implementation

---

### 6. Logger (Winston)

**Responsibilities**:
- Structured logging across all layers
- Console logging in development
- File rotation in production
- Consistent log format with context

**Architecture**:

```text
Application / Domain
        │
        ▼
    Logger interface (@Inject(LOGGER))
        │
        ▼
WinstonLoggerService
        │
        ▼
Winston Console + DailyRotateFile
```

**Log Format (Development)**:

```text
2026-08-23T21:30:12.123Z info [CreateTicketHandler] Ticket created {"ticketId":"123"}
```

**Log Files (Production)**:

```text
logs/
├── error-2026-08-23.log      (errors only)
└── combined-2026-08-23.log   (all levels)
```

Configuration: 20MB max size, 14-day retention, JSON format.

---

## Complete System Flow

### Phase 1: Ticket Creation

```text
1. User submits ticket via Next.js frontend
   ↓
2. Frontend sends POST /tickets to API
   ↓
3. TicketsController receives request
   ↓
4. CreateTicketCommand is dispatched via CommandBus
   ↓
5. CreateTicketHandler executes:
   a. Creates Ticket entity with status: PROCESSING
   b. Saves ticket to Supabase
   c. Publishes TicketCreatedEvent to RabbitMQ
   ↓
6. API returns ticket to frontend
   ↓
7. Frontend displays ticket with "PROCESSING" status
```

**Duration**: ~100-500ms (synchronous)

---

### Phase 2: Asynchronous AI Processing

```text
1. RabbitMQ receives TicketCreatedEvent
   ↓
2. Event is routed to ticket.ai.processing queue
   ↓
3. TicketCreatedConsumer receives message
   ↓
4. Consumer parses event and creates AnalyzeTicketCommand
   ↓
5. AnalyzeTicketCommand is dispatched via CommandBus
   ↓
6. AnalyzeTicketHandler executes:
   a. Retrieves ticket from Supabase
   b. Calls SupportAgent.analyzeTicket()
   c. SupportAgent executes AI tools:
      - TicketClassifierTool
      - PriorityAnalyzerTool
      - SentimentAnalyzerTool
      - ResponseGeneratorTool
   d. Receives TicketAnalysis from AI
   e. Updates ticket in Supabase with analysis
   f. Updates ticket status to ANALYZED
   ↓
7. Message is acknowledged (ACK)
```

**Duration**: ~5-30 seconds (asynchronous)

---

### Phase 3: Frontend Update (Real-Time via SSE)

```text
1. AnalyzeTicketHandler completes and emits TicketUpdatedEvent
   ↓
2. EventEmitter2 broadcasts 'ticket.updated' in-process
   ↓
3. TicketEventsController pushes event to SSE stream
   ↓
4. Frontend TicketStream component receives event
   ↓
5. router.refresh() re-fetches Server Components
   ↓
6. Ticket now shows:
   - Status: ANALYZED
   - Priority: HIGH/MEDIUM/LOW
   - Category: ORDER/BILLING/etc.
   - Sentiment: FRUSTRATED/POSITIVE/etc.
   - Confidence: 0.94
   - Suggested Response: "..."
```

**Duration**: Near-instantaneous (<1 second from AI completion to UI update)

---

## Error Handling and Retry Flow

### Transient Failure (Temporary)

```text
1. AI processing fails (e.g., network timeout)
   ↓
2. RabbitMQConsumer catches error
   ↓
3. RabbitMQRetry.handleFailure() executes:
   a. Checks retry count (0 < 3)
   b. Calculates backoff delay (5 seconds)
   c. Sends message to retry queue with:
      - expiration: 5000ms
      - x-retry-count: 1
   d. ACKs original message
   ↓
4. Message waits in retry queue for 5 seconds
   ↓
5. TTL expires, message returns to main queue
   ↓
6. Consumer retries processing
   ↓
7. If successful: ACK and done
   If failed: Repeat steps 2-6 (up to 3 times)
```

**Retry Schedule**:
- Retry 1: 5 seconds
- Retry 2: 25 seconds
- Retry 3: 125 seconds

---

### Permanent Failure

```text
1. AI processing fails after 3 retries
   ↓
2. RabbitMQRetry.handleFailure() executes:
   a. Checks retry count (3 >= 3)
   b. Sends message to DLQ with:
      - x-retry-count: 3
      - x-last-error: "Error message"
      - x-last-error-at: timestamp
   c. ACKs original message
   ↓
3. Message stays in DLQ for manual inspection
   ↓
4. Developer investigates via:
   - RabbitMQ Management UI
   - DLQ Management API (future)
   ↓
5. After fixing issue, message can be reprocessed
```

---

## Data Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
│                                                                   │
│  app/                    components/          features/           │
│  ┌──────────────┐        ┌──────────────┐     ┌──────────────┐   │
│  │ /tickets     │◄───────│ TicketList   │◄────│ tickets.api  │   │
│  │ /tickets/new │        │ TicketStream │     │ use-tickets  │   │
│  │ /tickets/:id │        │ StatusBadge  │     │ ticket.types │   │
│  └──────────────┘        └──────┬───────┘     └──────────────┘   │
│         │                       │                                │
│         │ GET /tickets          │ EventSource                    │
│         │ POST /tickets         │ /events/tickets/stream         │
│         │                       │                                │
│         ▼                       ▼                                │
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND API (NestJS)                        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Presentation Layer                       │  │
│  │  TicketsController    TicketEventsController (SSE)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │                       ▲                                │
│         ▼                       │                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Application Layer                        │  │
│  │  CommandBus → CreateTicketHandler                        │  │
│  │  CommandBus → AnalyzeTicketHandler ──► TicketEventEmitter│  │
│  │  QueryBus → GetTicketHandler                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │                       ▲                                │
│         ▼                       │                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Domain Layer                           │  │
│  │  Ticket, TicketAnalysis, DomainEvent                     │  │
│  │  TicketCreatedEvent, TicketUpdatedEvent                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │                                                        │
└─────────┼────────────────────────────────────────────────────────┘
          │
          ├─────────────► Supabase (PostgreSQL)
          │
          └─────────────► RabbitMQ ──► AI Consumer ──► AI Provider
                              │
                              ▼
                      EventEmitter2 (in-process)
                              │
                              ▼
                    TicketEventsController
                              │
                              ▼
                         SSE Stream
                              │
                              ▼
                  Frontend EventSource
```

---

## Key Architectural Decisions

### 1. Event-Driven Architecture

**Decision**: Use RabbitMQ to decouple ticket creation from AI processing.

**Rationale**:
- AI processing can take 5-30 seconds
- Users shouldn't wait for AI to complete
- System can scale independently
- Failures in AI don't affect ticket creation

**Trade-offs**:
- Eventual consistency (ticket status updates asynchronously)
- More complex error handling
- Need for retry mechanism

---

### 2. CQRS (Command Query Responsibility Segregation)

**Decision**: Separate commands (writes) from queries (reads).

**Rationale**:
- Clear separation of concerns
- Commands can trigger side effects (events)
- Queries are optimized for reading
- Easier to understand and test

**Trade-offs**:
- More boilerplate code
- Need to manage both command and query handlers

---

### 3. Clean Architecture

**Decision**: Organize code into layers with dependencies pointing inward.

**Rationale**:
- Domain logic is independent of infrastructure
- Easy to swap databases, message brokers, AI providers
- Testable without external dependencies
- Clear boundaries and responsibilities

**Trade-offs**:
- More files and abstractions
- Learning curve for new developers

---

### 4. AI Agent with Tools

**Decision**: Use an agent pattern with specialized tools for AI analysis.

**Rationale**:
- Modular and extensible
- Each tool has a single responsibility
- Easy to add new analysis capabilities
- Tools can be tested independently

**Trade-offs**:
- More complex than a single AI call
- Need to coordinate tool execution

---

### 5. Retry with Exponential Backoff

**Decision**: Implement automatic retry with increasing delays.

**Rationale**:
- Handles transient failures gracefully
- Prevents overwhelming failing services
- Reduces need for manual intervention

**Trade-offs**:
- Increased latency for failed messages
- Need to configure retry parameters
- Potential for duplicate processing

---

### 6. Server-Sent Events (SSE) for Real-Time Updates

**Decision**: Use SSE with in-process EventEmitter2 to push ticket status updates to the frontend.

**Rationale**:
- AI processing takes 5-30 seconds; users shouldn't need to manually refresh
- SSE is simpler than WebSocket for unidirectional server-to-client updates
- EventEmitter2 keeps the SSE layer decoupled from RabbitMQ
- Browser-native `EventSource` API requires no additional client libraries

**Trade-offs**:
- SSE connections are unidirectional (server → client only)
- EventEmitter2 events are in-process (not distributed across multiple API instances)
- Each connected client maintains an open HTTP connection

---

## Scalability Considerations

### Horizontal Scaling

**API Servers**:
- Can run multiple instances behind a load balancer
- Stateless (no in-memory session state)
- Each instance can handle requests independently

**Consumers**:
- Can run multiple consumer instances
- RabbitMQ distributes messages across consumers
- Prefetch setting controls message distribution

**Database**:
- Supabase handles scaling automatically
- Read replicas for query scaling
- Connection pooling for high concurrency

---

### Performance Optimization

**Caching**:
- Cache frequently accessed tickets
- Cache AI analysis results
- Use Redis for distributed caching (future)

**Async Processing**:
- AI processing happens asynchronously
- Users get immediate response
- System can handle bursty traffic

**Batch Processing**:
- Process multiple tickets in a single AI call (future)
- Reduce API costs
- Improve throughput

---

## Security Considerations

### API Security

- JWT authentication for API endpoints
- Rate limiting to prevent abuse
- Input validation on all endpoints
- SQL injection prevention (Supabase parameterized queries)

### Data Security

- Sensitive data encrypted at rest (Supabase)
- API keys stored in environment variables
- No secrets in code or version control
- HTTPS for all external communication

### RabbitMQ Security

- Authentication with username/password
- TLS encryption for message transport (production)
- Access control for queues and exchanges

---

## Monitoring and Observability

### Metrics to Monitor

**Application**:
- Request rate and latency
- Error rate by endpoint
- Ticket creation rate
- AI processing time

**Infrastructure**:
- RabbitMQ queue lengths
- Consumer processing rate
- Database connection pool usage
- CPU and memory usage

**Business**:
- Tickets by status (PROCESSING, ANALYZED, FAILED)
- AI confidence distribution
- Retry rate
- DLQ message count

### Logging

**Application Logs**:
- Request/response logging
- Error logging with stack traces
- Business event logging (ticket created, analyzed)

**Infrastructure Logs**:
- RabbitMQ connection logs
- Database query logs
- AI API call logs

### Alerting

**Critical Alerts**:
- High error rate (>5%)
- DLQ message count > 0
- RabbitMQ connection lost
- Database connection lost

**Warning Alerts**:
- High latency (>5s)
- Retry rate increasing
- Queue length growing

---

## Future Enhancements

### Short-term

1. **DLQ Management API**: Endpoints to inspect and reprocess DLQ messages
2. ~~**WebSocket Updates**: Real-time ticket status updates to frontend~~ **Completed** via SSE (`/events/tickets/stream`)
3. **Batch Processing**: Process multiple tickets in a single AI call
4. **Caching Layer**: Redis cache for frequently accessed data

### Medium-term

1. **Multi-language Support**: AI analysis in multiple languages
2. **Custom AI Models**: Fine-tuned models for specific domains
3. **Advanced Analytics**: Dashboard with ticket trends and insights
4. **Integration APIs**: Webhooks and APIs for third-party integrations

### Long-term

1. **Multi-tenancy**: Support for multiple organizations
2. **Advanced AI**: RAG (Retrieval-Augmented Generation) for context-aware responses
3. **Workflow Automation**: Automated ticket routing and assignment
4. **Customer Portal**: Self-service portal for customers

---

## Conclusion

AI Support Desk demonstrates a modern, scalable architecture for building intelligent applications. By combining Clean Architecture, event-driven design, and AI-powered analysis, the system provides a robust foundation for automated customer support.

The modular design allows for easy extension and maintenance, while the focus on separation of concerns ensures that each component can evolve independently. The retry mechanism and DLQ provide resilience, making the system suitable for production use.
