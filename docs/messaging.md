# Messaging System

## Overview

AI Support Desk uses a broker-agnostic messaging abstraction to decouple ticket creation from AI processing. The system currently implements RabbitMQ, but the abstraction layer allows switching to other message brokers (Kafka, SQS, etc.) without modifying application logic.

This document explains the messaging architecture, components, and patterns used in the system.

---

## Architecture

### Two-Layer Design

The messaging system is divided into two distinct layers:

**1. RabbitMQModule (Generic Broker Implementation)**
- Implements broker-specific logic
- Provides generic interfaces for queue and exchange configuration
- Can be replaced with other brokers without affecting application code
- Exports: `RabbitMQConsumer`, `RabbitMQMessagePublisher`
- Internal: `RabbitMQConnection`, `RabbitMQTopology`, `RabbitMQRetry`

**2. MessagingModule (Application-Specific)**
- Uses generic messaging interfaces
- Contains application-specific consumers (e.g., `TicketCreatedConsumer`)
- Configures queues and exchanges for the application's needs

```text
MessagingModule (Application-Specific)
    │
    ├── imports: RabbitMQModule
    │
    ├── TicketCreatedConsumer
    └── MESSAGE_PUBLISHER → RabbitMQMessagePublisher
    
RabbitMQModule (Generic, Reusable)
    │
    ├── RabbitMQConnection (internal)
    ├── RabbitMQTopology (internal)
    ├── RabbitMQRetry (internal)
    ├── RabbitMQConsumer (exported)
    └── RabbitMQMessagePublisher (exported)
```

### Generic Interfaces

The system uses broker-agnostic interfaces defined in `messaging.types.ts`:

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

**Benefits**:
- **Broker Independence**: Application code doesn't depend on RabbitMQ-specific types
- **Flexibility**: Optional retry and DLQ configuration per queue
- **Replaceability**: Easy to switch to Kafka, SQS, or other brokers

### High-Level Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                         API Layer                            │
│                                                              │
│  POST /tickets                                               │
│       │                                                      │
│       ▼                                                      │
│  CreateTicketHandler                                         │
│       │                                                      │
│       ├──────────────────┐                                   │
│       │                  │                                   │
│       ▼                  ▼                                   │
│  Supabase          RabbitMQ                                  │
│  (persist)         (publish event)                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    RabbitMQ Broker                           │
│                                                              │
│  Exchange: support.events                                    │
│       │                                                      │
│       │ routing key: ticket.created                          │
│       ▼                                                      │
│  Queue: ticket.ai.processing                                 │
│       │                                                      │
│       ▼                                                      │
│  TicketCreatedConsumer                                       │
│       │                                                      │
│       ▼                                                      │
│  CommandBus.execute(AnalyzeTicketCommand)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI Processing                             │
│                                                              │
│  AnalyzeTicketHandler                                        │
│       │                                                      │
│       ▼                                                      │
│  SupportAgent                                                │
│       │                                                      │
│       ├──────────────────┐                                   │
│       │                  │                                   │
│       ▼                  ▼                                   │
│  AIProvider        Supabase                                  │
│  (OpenCode)        (update analysis)                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. RabbitMQConnection

**Responsibility**: Centralized connection management

```typescript
@Injectable()
export class RabbitMQConnection implements OnModuleDestroy {
  async getChannel(): Promise<amqp.Channel>
}
```

**Key Features**:
- Single connection shared across all components
- Lazy initialization (connects on first use)
- Automatic cleanup on module destruction
- Channel reuse for efficiency

**Why**: Avoids creating multiple connections to RabbitMQ, which is expensive and can lead to resource exhaustion.

---

### 2. RabbitMQTopology

**Responsibility**: Infrastructure setup (exchanges, queues, bindings)

```typescript
@Injectable()
export class RabbitMQTopology {
  async setupQueue(
    config: MessageQueueConfig,
    exchange: MessageExchangeConfig,
  ): Promise<void>
}
```

**Configuration**:

Uses generic `MessageQueueConfig` interface:

```typescript
interface MessageQueueConfig {
  queue: string;
  routingKey: string;
  retryQueue?: string;        // Optional
  deadLetterQueue?: string;   // Optional
  durable?: boolean;
  autoDelete?: boolean;
}
```

**Key Features**:
- Generic implementation using broker-agnostic interfaces
- Supports optional retry and DLQ queues
- Idempotent queue creation (safe to call multiple times)
- Configurable exchange and queue properties

**Why**: Separates infrastructure concerns from business logic. The topology is declared using generic interfaces, making it easy to implement for other brokers.

---

### 3. RabbitMQMessagePublisher

**Responsibility**: Publish domain events to RabbitMQ

```typescript
@Injectable()
export class RabbitMQMessagePublisher implements MessagePublisher {
  async publish(event: DomainEvent): Promise<void>
}
```

**Implementation**:

```typescript
async publish(event: DomainEvent): Promise<void> {
  const channel = await this.connection.getChannel();
  
  channel.publish(
    'support.events',
    event.eventType,  // routing key
    Buffer.from(JSON.stringify(event)),
    {
      persistent: true,
      contentType: 'application/json',
    }
  );
}
```

**Key Features**:
- Implements `MessagePublisher` interface (Dependency Inversion)
- Uses shared connection from `RabbitMQConnection`
- Messages are persistent (survive broker restart)
- JSON serialization for interoperability

**Why**: Application layer depends on abstraction (`MessagePublisher`), not on RabbitMQ implementation. This allows swapping the message broker without changing business logic.

---

### 4. RabbitMQConsumer

**Responsibility**: Generic message consumption with error handling

```typescript
@Injectable()
export class RabbitMQConsumer {
  async consume(
    config: MessageQueueConfig,
    exchange: MessageExchangeConfig,
    handler: (message: ConsumeMessage) => Promise<void>,
  ): Promise<void>
}
```

**Key Features**:
- Generic and reusable for any queue configuration
- Uses broker-agnostic interfaces (`MessageQueueConfig`, `MessageExchangeConfig`)
- Automatically sets up topology before consuming
- Handles errors and delegates to `RabbitMQRetry`
- Prefetch of 1 (process one message at a time)

**Why**: Business consumers (like `TicketCreatedConsumer`) only need to focus on message processing logic, not on RabbitMQ details or queue configuration.

---

### 5. RabbitMQRetry

**Responsibility**: Retry logic with exponential backoff and DLQ

```typescript
@Injectable()
export class RabbitMQRetry {
  async handleFailure(
    message: ConsumeMessage,
    error: Error,
    config: RetryConfig,
  ): Promise<void>
}
```

**Retry Flow**:

```text
Message Processing
    │
    ├── Success → ACK
    │
    └── Failure
          │
          ▼
    Check retry count
          │
          ├── retryCount < maxRetries
          │     │
          │     ▼
          │   Calculate backoff delay
          │     │
          │     ▼
          │   Send to retry queue with:
          │   - expiration: delay (per-message TTL)
          │   - x-retry-count: incremented
          │   - x-last-error: error message
          │   - x-last-error-at: timestamp
          │     │
          │     ▼
          │   ACK original message
          │
          └── retryCount >= maxRetries
                │
                ▼
              Send to DLQ with:
              - x-retry-count: final count
              - x-last-error: error message
              - x-last-error-at: timestamp
              - x-original-queue: source queue
                │
                ▼
              ACK original message
```

**Exponential Backoff Formula**:

```typescript
calculateBackoff(retryCount: number): number {
  const multiplier = Math.pow(5, retryCount - 1);
  const delay = this.baseDelay * multiplier;
  return Math.min(delay, 5 * 60 * 1000); // Max 5 minutes
}
```

**Example Delays**:
- Retry 1: 5 seconds
- Retry 2: 25 seconds (5 × 5)
- Retry 3: 125 seconds (5 × 25)
- Retry 4+: Capped at 5 minutes

**Configuration** (via environment variables):

```env
BROKER_MAX_RETRIES=3
BROKER_RETRY_BASE_DELAY=5000
```

**Why**: 
- Exponential backoff prevents overwhelming failing services
- Per-message TTL allows different delays per retry attempt
- DLQ prevents infinite retry loops
- Metadata in headers enables debugging and monitoring

---

### 6. TicketCreatedConsumer

**Responsibility**: Business logic for processing ticket.created events

```typescript
@Injectable()
export class TicketCreatedConsumer implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.consumer.consume(
      TICKET_CREATED_QUEUE,      // Generic MessageQueueConfig
      SUPPORT_EVENTS_EXCHANGE,   // Generic MessageExchangeConfig
      async (message) => {
        await this.processMessage(message);
      },
    );
  }

  private async processMessage(message: ConsumeMessage): Promise<void> {
    const event = JSON.parse(message.content.toString()) as DomainEvent;
    const command = new AnalyzeTicketCommand(event.aggregateId);
    await this.commandBus.execute(command);
  }
}
```

**Configuration** (from `messaging.config.ts`):

```typescript
export const TICKET_CREATED_QUEUE: MessageQueueConfig = {
  queue: 'ticket.ai.processing',
  routingKey: 'ticket.created',
  retryQueue: 'ticket.ai.processing.retry',
  deadLetterQueue: 'ticket.ai.processing.dlq',
};

export const SUPPORT_EVENTS_EXCHANGE: MessageExchangeConfig = {
  name: 'support.events',
  type: 'topic',
};
```

**Key Features**:
- Only knows about business logic (Event → Command)
- Uses generic interfaces from `messaging.config.ts`
- Delegates all RabbitMQ concerns to `RabbitMQConsumer`
- Integrates with CQRS via `CommandBus`

**Why**: Separation of concerns. The consumer doesn't need to know about retries, DLQ, or RabbitMQ internals. Configuration is centralized and uses broker-agnostic interfaces.

---

## Message Flow Examples

### Successful Processing

```text
1. POST /tickets
   ↓
2. CreateTicketHandler
   ↓
3. Save to Supabase (status: PROCESSING)
   ↓
4. Publish TicketCreatedEvent
   ↓
5. RabbitMQ receives message
   ↓
6. TicketCreatedConsumer receives message
   ↓
7. Execute AnalyzeTicketCommand
   ↓
8. AnalyzeTicketHandler
   ↓
9. Call AIProvider.analyzeTicket()
   ↓
10. Save analysis to Supabase (status: ANALYZED)
    ↓
11. ACK message
```

### Processing with Retry

```text
1-6. [Same as above]
    ↓
7. Execute AnalyzeTicketCommand
    ↓
8. AIProvider fails (temporary error)
    ↓
9. RabbitMQConsumer catches error
    ↓
10. RabbitMQRetry.handleFailure()
    ↓
11. retryCount (0) < maxRetries (3)
    ↓
12. Send to retry queue with:
    - expiration: 5000ms
    - x-retry-count: 1
    ↓
13. ACK original message
    ↓
14. [Wait 5 seconds]
    ↓
15. TTL expires, message returns to main queue
    ↓
16. TicketCreatedConsumer receives message again
    ↓
17. [Repeat steps 7-13 if still failing]
    ↓
18. Eventually succeeds or reaches max retries
```

### Processing with DLQ

```text
1-6. [Same as above]
    ↓
7. Execute AnalyzeTicketCommand
    ↓
8. AIProvider fails (persistent error)
    ↓
9. RabbitMQConsumer catches error
    ↓
10. RabbitMQRetry.handleFailure()
    ↓
11. retryCount (3) >= maxRetries (3)
    ↓
12. Send to DLQ with:
    - x-retry-count: 3
    - x-last-error: "OpenCode API error"
    - x-last-error-at: "2026-08-22T14:30:00.000Z"
    ↓
13. ACK original message
    ↓
14. Message stays in DLQ for manual inspection
```

---

## DLQ Management

### Inspecting DLQ Messages

You can inspect messages in the DLQ using RabbitMQ Management UI:

1. Navigate to `http://localhost:15672`
2. Go to **Queues** → `ticket.ai.processing.dlq`
3. Click **Get messages** to view message contents
4. Inspect headers for error details

### Reprocessing DLQ Messages

To reprocess a message from the DLQ:

1. Get the message from DLQ
2. Publish it back to the main queue:

```typescript
channel.sendToQueue('ticket.ai.processing', message.content, {
  persistent: true,
  headers: {
    ...message.properties.headers,
    'x-reprocessed': true,
    'x-reprocessed-at': new Date().toISOString(),
  },
});
channel.ack(message);
```

3. The message will be processed again from the beginning

### Future Enhancement: DLQ Management API

Planned endpoints for DLQ management:

```text
GET    /admin/dlq                       - List messages in DLQ
GET    /admin/dlq/:messageId            - Get message details
POST   /admin/dlq/:messageId/reprocess  - Reprocess a message
POST   /admin/dlq/reprocess-all         - Reprocess all messages
DELETE /admin/dlq/:messageId            - Delete a message
```

---

## Configuration

### Environment Variables

```env
# RabbitMQ connection
BROKER_URL=amqp://guest:guest@localhost:5672

# Retry configuration
BROKER_MAX_RETRIES=3
BROKER_RETRY_BASE_DELAY=5000
```

### RabbitMQ Docker Setup

```yaml
services:
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"      # AMQP protocol
      - "15672:15672"    # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
```

---

## Monitoring and Observability

### Key Metrics to Monitor

1. **Queue Lengths**:
   - `ticket.ai.processing` - Should be low (messages processed quickly)
   - `ticket.ai.processing.retry` - Indicates retry activity
   - `ticket.ai.processing.dlq` - Indicates permanent failures

2. **Message Rates**:
   - Publish rate (tickets created)
   - Delivery rate (messages consumed)
   - ACK rate (successful processing)

3. **Consumer Status**:
   - Number of active consumers
   - Consumer uptime

### RabbitMQ Management UI

Access at `http://localhost:15672` (guest/guest)

**Useful Views**:
- **Overview**: General broker health
- **Queues**: Queue lengths and message rates
- **Exchanges**: Message routing
- **Connections**: Active connections

### Logging

The system logs key events:

```text
Connected to RabbitMQ
RabbitMQ topology configured
Consumer started: ticket.ai.processing
Published event: ticket.created (uuid)
Received event: ticket.created (uuid)
Successfully processed event: uuid
Retry 1/3 after 5000ms
Retry 2/3 after 25000ms
Max retries reached. Moving message to ticket.ai.processing.dlq
```

---

## Best Practices

### 1. Idempotent Processing

Ensure message handlers are idempotent. A message might be delivered more than once due to network issues or retries.

**Example**: Check if ticket is already analyzed before processing.

### 2. Dead Letter Everything

Always configure a DLQ. Messages that fail permanently should not be lost.

### 3. Monitor DLQ

Set up alerts for DLQ message count. A growing DLQ indicates systematic failures.

### 4. Test Retry Logic

Test your retry logic with simulated failures to ensure:
- Exponential backoff works correctly
- Messages eventually reach DLQ
- Metadata is preserved across retries

### 5. Use Per-Message TTL

Use per-message TTL (`expiration` property) instead of queue-level TTL for retry queues. This allows different delays per retry attempt.

### 6. Prefetch Wisely

Set prefetch count based on processing time. A prefetch of 1 is safe for long-running tasks. Increase for high-throughput scenarios.

### 7. Handle Poison Messages

A poison message is one that always fails. The DLQ + max retries pattern prevents poison messages from blocking the queue.

---

## Troubleshooting

### Messages Not Being Consumed

**Check**:
1. Is the consumer running? Check logs for "Consumer started"
2. Is the queue bound to the exchange? Check RabbitMQ UI
3. Is the routing key correct? Should be `ticket.created`

### Messages Stuck in Retry Queue

**Check**:
1. Is the TTL configured correctly?
2. Are messages expiring and returning to main queue?
3. Check RabbitMQ UI for queue arguments

### Messages Going Straight to DLQ

**Check**:
1. Is `BROKER_MAX_RETRIES` set correctly?
2. Are errors being caught properly?
3. Check error logs for the actual failure reason

### Connection Issues

**Check**:
1. Is RabbitMQ running? `docker ps`
2. Is `BROKER_URL` correct?
3. Check network connectivity
4. Check RabbitMQ logs

---

## Future Enhancements

### 1. Circuit Breaker

Implement a circuit breaker pattern to temporarily stop sending messages to a failing service.

### 2. Message Prioritization

Support priority queues for urgent tickets.

### 3. Batch Processing

Process multiple messages in a single transaction for better throughput.

### 4. Message Versioning

Version message schemas to support backward compatibility during upgrades.

### 5. Distributed Tracing

Integrate with OpenTelemetry or similar for end-to-end tracing.

---

## Summary

The messaging system provides:

- ✅ **Decoupling**: Ticket creation is independent of AI processing
- ✅ **Resilience**: Automatic retries with exponential backoff
- ✅ **Reliability**: Dead Letter Queue for permanent failures
- ✅ **Scalability**: Easy to add more consumers
- ✅ **Observability**: Logging and monitoring support
- ✅ **Maintainability**: Clean separation of concerns
- ✅ **Broker Independence**: Generic interfaces allow switching message brokers

The refactored architecture separates RabbitMQ infrastructure from business logic, making the system easier to understand, test, and maintain.

---

## Switching to a Different Broker

The broker-agnostic abstraction makes it straightforward to switch from RabbitMQ to another message broker (e.g., Kafka, SQS, Azure Service Bus).

### Steps to Switch Brokers

1. **Create a new broker module** (e.g., `KafkaModule`):

```typescript
@Module({
  providers: [
    KafkaConnection,
    KafkaTopology,
    KafkaRetry,
    KafkaConsumer,
    KafkaMessagePublisher,
  ],
  exports: [KafkaConsumer, KafkaMessagePublisher],
})
export class KafkaModule {}
```

2. **Implement the same generic interfaces**:

```typescript
// KafkaConsumer uses the same MessageQueueConfig interface
@Injectable()
export class KafkaConsumer {
  async consume(
    config: MessageQueueConfig,      // Same interface
    exchange: MessageExchangeConfig, // Same interface
    handler: (message: KafkaMessage) => Promise<void>,
  ): Promise<void> {
    // Kafka-specific implementation
  }
}
```

3. **Update MessagingModule** to import the new broker module:

```typescript
@Module({
  imports: [KafkaModule],  // Changed from RabbitMQModule
  providers: [
    TicketCreatedConsumer,
    {
      provide: MESSAGE_PUBLISHER,
      useExisting: KafkaMessagePublisher,
    },
  ],
})
export class MessagingModule {}
```

4. **No changes needed** in:
   - `TicketCreatedConsumer` (uses generic interfaces)
   - `messaging.config.ts` (uses generic interfaces)
   - Business logic (uses `MessagePublisher` abstraction)

### Benefits of This Approach

- **Zero business logic changes**: Consumers and handlers remain unchanged
- **Configuration reuse**: Queue and exchange configs work with any broker
- **Gradual migration**: Can run both brokers in parallel during transition
- **Testing**: Easy to mock different brokers in tests

### Example: Kafka Implementation

```typescript
// messaging.config.ts (unchanged)
export const TICKET_CREATED_QUEUE: MessageQueueConfig = {
  queue: 'ticket.ai.processing',
  routingKey: 'ticket.created',
  retryQueue: 'ticket.ai.processing.retry',
  deadLetterQueue: 'ticket.ai.processing.dlq',
};

// Kafka consumer maps generic config to Kafka concepts
@Injectable()
export class KafkaConsumer {
  async consume(config: MessageQueueConfig, ...) {
    // Map MessageQueueConfig to Kafka topic/partition config
    const kafkaConfig = this.mapToKafkaConfig(config);
    // Subscribe to Kafka topic
    await this.kafkaClient.subscribe(kafkaConfig);
  }
}
```

This demonstrates the power of the abstraction: the same configuration works across different brokers, and only the infrastructure layer needs to change.
