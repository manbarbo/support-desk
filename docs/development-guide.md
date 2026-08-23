# Development Guide

## Quick Start

This guide will help you set up and run the AI Support Desk application locally.

---

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   ```bash
   node --version
   # Should output: v18.x.x or higher
   ```

2. **pnpm** (v9 or higher)
   ```bash
   pnpm --version
   # Should output: 9.x.x or higher
   ```
   
   Install pnpm:
   ```bash
   npm install -g pnpm
   ```

3. **Docker** and **Docker Compose**
   ```bash
   docker --version
   docker-compose --version
   ```

4. **Supabase Account**
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and API keys

5. **OpenCode API Key**
   - Sign up at [opencode.ai](https://opencode.ai)
   - Get your API key

---

## Project Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd SupportDesk
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install dependencies for:
- Root monorepo
- `apps/api` (NestJS backend)
- `apps/web` (Next.js frontend)

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

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

**Important**: 
- Use `SUPABASE_SECRET_KEY` (not the anon key) for the backend
- Never commit `.env` to version control

### 4. Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the following SQL to create the tickets table:

```sql
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY,
  customer_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'PROCESSING', 'ANALYZED', 'FAILED', 'RESOLVED')),
  priority TEXT CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  category TEXT CHECK (category IN ('ORDER', 'BILLING', 'TECHNICAL', 'ACCOUNT', 'GENERAL')),
  sentiment TEXT CHECK (sentiment IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'FRUSTRATED', 'ANGRY')),
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
  suggested_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
```

4. Verify the table was created:
   ```sql
   SELECT * FROM tickets LIMIT 1;
   ```

### 5. Start Infrastructure (RabbitMQ)

```bash
docker compose up -d
```

Verify RabbitMQ is running:

```bash
docker ps
# You should see: support-desk-rabbitmq
```

Access RabbitMQ Management UI:
- URL: http://localhost:15672
- Username: `guest`
- Password: `guest`

---

## Running the Application

### Option 1: Run Everything (Recommended)

```bash
pnpm dev
```

This starts both the API and web application in parallel.

### Option 2: Run Separately

**Terminal 1 - API**:
```bash
pnpm dev:api
```

**Terminal 2 - Web**:
```bash
pnpm dev:web
```

### Access the Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **RabbitMQ UI**: http://localhost:15672

---

## Testing the Application

### 1. Create a Ticket via API

```bash
curl -X POST http://localhost:3001/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "title": "My order has not arrived",
    "description": "My order was supposed to arrive five days ago. I am very frustrated."
  }'
```

**Expected Response**:
```json
{
  "id": "uuid-generated",
  "customerId": "customer-123",
  "title": "My order has not arrived",
  "description": "My order was supposed to arrive five days ago. I am very frustrated.",
  "status": "PROCESSING",
  "createdAt": "2026-08-22T10:00:00.000Z",
  "updatedAt": "2026-08-22T10:00:00.000Z"
}
```

### 2. Check Ticket Status

Copy the `id` from the response and check the ticket:

```bash
curl http://localhost:3001/tickets/{ticket-id}
```

**Initial Response** (before AI processing):
```json
{
  "id": "uuid-generated",
  "status": "PROCESSING",
  ...
}
```

**Wait 5-30 seconds**, then check again:

```bash
curl http://localhost:3001/tickets/{ticket-id}
```

**Final Response** (after AI processing):
```json
{
  "id": "uuid-generated",
  "customerId": "customer-123",
  "title": "My order has not arrived",
  "description": "My order was supposed to arrive five days ago. I am very frustrated.",
  "status": "ANALYZED",
  "priority": "HIGH",
  "category": "ORDER",
  "sentiment": "FRUSTRATED",
  "confidence": 0.94,
  "suggestedResponse": "We apologize for the delay in your order delivery...",
  "createdAt": "2026-08-22T10:00:00.000Z",
  "updatedAt": "2026-08-22T10:00:05.000Z"
}
```

### 3. Verify in Supabase

Go to Supabase SQL Editor and run:

```sql
SELECT 
  id,
  customer_id,
  title,
  status,
  priority,
  category,
  sentiment,
  confidence,
  suggested_response,
  created_at
FROM tickets
ORDER BY created_at DESC
LIMIT 5;
```

### 4. Check RabbitMQ

Go to RabbitMQ Management UI (http://localhost:15672):

1. **Queues Tab**: Verify queues exist
   - `ticket.ai.processing`
   - `ticket.ai.processing.retry`
   - `ticket.ai.processing.dlq`

2. **Exchanges Tab**: Verify exchange exists
   - `support.events`

3. **Queue Details**: Click on `ticket.ai.processing`
   - Messages should be processed (queue should be empty or near-empty)

---

## Frontend Development Conventions

### Folder Structure

The frontend follows the structure documented in [Frontend Architecture](frontend-architecture.md):

```text
apps/web/src/
├── app/              # Next.js routes only
├── components/       # Reusable UI
│   ├── layout/       # Header, Sidebar
│   ├── tickets/      # Ticket-specific UI
│   └── ui/           # Generic primitives (Button, Input, Badge)
├── features/tickets/ # Feature logic
│   ├── api/
│   ├── hooks/
│   ├── types/
│   └── utils/
├── lib/api/          # Generic HTTP client
├── types/            # Global types
└── config/           # Environment variables
```

### Key Rules

1. **Keep `app/` thin.** Pages should delegate to components and features.
2. **Use Server Components by default.** Only add `'use client'` for interactivity.
3. **Do not call `fetch` directly.** Use `lib/api/client.ts` or feature API functions.
4. **Colocate ticket types in `features/tickets/types/`**, not in a global `types/` folder.
5. **Name component files with PascalCase**: `Header.tsx`, `TicketList.tsx`.
6. **Name non-component files with kebab-case**: `tickets.api.ts`, `use-tickets.ts`.

### Environment Variables

Frontend-visible variables must use the `NEXT_PUBLIC_` prefix:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Read them through `config/env.ts`:

```typescript
import { env } from '@/config/env';

// env.apiUrl
```

### Data Fetching

- **Server Components**: import API functions from `features/tickets/api/tickets.api.ts` and `await` them directly.
- **Client Components**: use hooks from `features/tickets/hooks/`.
- Use `cache: 'no-store'` for ticket data because status changes asynchronously from `PROCESSING` to `ANALYZED`.

---

## Testing the Frontend

### 1. Access the Dashboard

Open http://localhost:3000 in your browser.

### 2. Create a Ticket

1. Click "New Ticket" or navigate to the create form
2. Fill in the form:
   - Customer ID: `customer-123`
   - Title: `My order has not arrived`
   - Description: `My order was supposed to arrive five days ago.`
3. Submit the form

### 3. View Ticket List

- You should see the ticket in the list
- Status should initially show "PROCESSING"
- After 5-30 seconds, refresh to see "ANALYZED"

### 4. View Ticket Details

- Click on the ticket to see details
- You should see:
  - Ticket information
  - AI analysis results (priority, category, sentiment)
  - Confidence score
  - Suggested response

---

## Testing Retry Mechanism

### 1. Simulate AI Failure

Temporarily change the AI configuration to force failures:

Edit `.env`:
```env
AI_BASE_URL=https://invalid-url-that-will-fail.com
```

Restart the API:
```bash
pnpm dev:api
```

### 2. Create a Ticket

```bash
curl -X POST http://localhost:3001/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "test-retry",
    "title": "Test retry mechanism",
    "description": "Testing retry logic"
  }'
```

### 3. Observe Retry Behavior

Watch the API logs:

```text
Received event: ticket.created (uuid) - Attempt 1/4
Failed to process message: Error: OpenCode API error
Retry 1/3 after 5000ms

[5 seconds later]

Received event: ticket.created (uuid) - Attempt 2/4
Failed to process message: Error: OpenCode API error
Retry 2/3 after 25000ms

[25 seconds later]

Received event: ticket.created (uuid) - Attempt 3/4
Failed to process message: Error: OpenCode API error
Retry 3/3 after 125000ms

[125 seconds later]

Received event: ticket.created (uuid) - Attempt 4/4
Failed to process message: Error: OpenCode API error
Max retries reached. Moving message to ticket.ai.processing.dlq
```

### 4. Check DLQ in RabbitMQ

Go to RabbitMQ UI → Queues → `ticket.ai.processing.dlq`

You should see the failed message with headers:
- `x-retry-count: 3`
- `x-last-error: "Error message"`
- `x-last-error-at: "timestamp"`

### 5. Restore Configuration

Edit `.env`:
```env
AI_BASE_URL=https://opencode.ai/zen/go/v1
```

Restart the API:
```bash
pnpm dev:api
```

---

## Troubleshooting

### Issue: API fails to start

**Symptoms**:
```text
Error: BROKER_URL is not configured
```

**Solution**:
- Check that `.env` file exists in the root directory
- Verify `BROKER_URL` is set correctly
- Restart the API

---

### Issue: RabbitMQ connection failed

**Symptoms**:
```text
Failed to connect to RabbitMQ: Error: connect ECONNREFUSED
```

**Solution**:
```bash
# Check if RabbitMQ is running
docker ps

# Start RabbitMQ
docker compose up -d

# Wait for RabbitMQ to be ready
docker logs support-desk-rabbitmq
```

---

### Issue: Supabase connection failed

**Symptoms**:
```text
Error: Supabase credentials not configured
```

**Solution**:
- Check `.env` file
- Verify `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set
- Ensure you're using the secret key, not the anon key

---

### Issue: AI analysis not working

**Symptoms**:
- Ticket stays in "PROCESSING" status
- No analysis results

**Solution**:
1. Check API logs for errors
2. Verify `AI_API_KEY` is set in `.env`
3. Check RabbitMQ UI for messages in queues
4. Check DLQ for failed messages
5. Verify OpenCode API is accessible

---

### Issue: Messages stuck in retry queue

**Symptoms**:
- Messages not being reprocessed
- Retry queue has messages

**Solution**:
1. Check RabbitMQ UI → Queues → `ticket.ai.processing.retry`
2. Verify TTL is set correctly
3. Check if consumer is running
4. Restart the API if needed

---

### Issue: Port already in use

**Symptoms**:
```text
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution**:
```bash
# Find process using the port
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or use a different port in .env
API_PORT=3002
```

---

## Development Commands

### Root Commands

```bash
# Install all dependencies
pnpm install

# Start both API and web
pnpm dev

# Start only API
pnpm dev:api

# Start only web
pnpm dev:web

# Build all apps
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint
```

### API Commands

```bash
# Navigate to API directory
cd apps/api

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov

# Lint code
pnpm lint

# Format code
pnpm format
```

### Web Commands

```bash
# Navigate to web directory
cd apps/web

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

---

## Database Management

### View All Tickets

```sql
SELECT 
  id,
  customer_id,
  title,
  status,
  priority,
  category,
  sentiment,
  confidence,
  created_at
FROM tickets
ORDER BY created_at DESC;
```

### Count Tickets by Status

```sql
SELECT 
  status,
  COUNT(*) as count
FROM tickets
GROUP BY status
ORDER BY count DESC;
```

### Find Failed Tickets

```sql
SELECT 
  id,
  title,
  status,
  created_at
FROM tickets
WHERE status = 'FAILED'
ORDER BY created_at DESC;
```

### Reset Ticket Status (for reprocessing)

```sql
UPDATE tickets
SET status = 'PROCESSING',
    priority = NULL,
    category = NULL,
    sentiment = NULL,
    confidence = NULL,
    suggested_response = NULL,
    updated_at = NOW()
WHERE id = 'your-ticket-id';
```

---

## Cleaning Up

### Stop All Services

```bash
# Stop API and web (Ctrl+C in terminals)

# Stop RabbitMQ
docker compose down

# Stop and remove volumes (WARNING: deletes RabbitMQ data)
docker compose down -v
```

### Clear Database

```sql
-- Delete all tickets (WARNING: irreversible)
DELETE FROM tickets;

-- Or drop the table entirely
DROP TABLE tickets;
```

### Clear RabbitMQ Queues

Go to RabbitMQ UI → Queues → Select queue → Purge

---

## Next Steps

Now that you have the application running:

1. **Explore the codebase**: Read through the architecture documentation
2. **Modify the AI prompt**: Customize the analysis in `OpenCodeAdapter`
3. **Add new tools**: Extend the `SupportAgent` with new capabilities
4. **Build the frontend**: Enhance the Next.js dashboard
5. **Add tests**: Write unit and integration tests
6. **Deploy**: Consider deploying to production

---

## Additional Resources

- [Architecture Documentation](./architecture.md)
- [Design Patterns](./patterns.md)
- [Messaging System](./messaging.md)
- [System Overview](./system-overview.md)
- [Development Plan](./development-plan.md)

---

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review the API logs for error messages
3. Check RabbitMQ UI for message status
4. Verify Supabase database state
5. Consult the architecture documentation

For bugs or feature requests, please open an issue in the repository.
