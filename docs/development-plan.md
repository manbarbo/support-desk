🗓️ Día 1 — Foundation + Backend Core

Objetivo:

Al final del día puedo crear un ticket, persistirlo en Supabase y publicar ticket.created en RabbitMQ.

09:00–10:00 — Monorepo

Crear:

ai-support-desk/
├── apps/
│ ├── api/
│ └── web/
├── packages/
├── docs/
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
└── docker-compose.yml

Stack:

Next.js
NestJS
TypeScript
pnpm
Docker
Resultado
pnpm dev

levanta:

Next.js → 3000
NestJS → 3001

10:00–11:00 — RabbitMQ

Docker Compose:

rabbitmq:
image: rabbitmq:management

Configurar:

AMQP: 5672
Management: 15672

Crear inicialmente:

support.events

y:

ticket.ai.processing
No hagas todavía DLQ

Primero:

Producer → Exchange → Queue → Consumer

Cuando eso funcione, agregamos retry/DLQ.

11:00–12:30 — Supabase

Crear:

tickets
ticket_analyses
messages

Pero inicialmente solamente necesitamos:

tickets

para poder avanzar.

Schema:

tickets
├── id
├── customer_id
├── title
├── description
├── status
├── created_at
└── updated_at

Estados:

enum TicketStatus {
OPEN = 'OPEN',
PROCESSING = 'PROCESSING',
ANALYZED = 'ANALYZED',
FAILED = 'FAILED',
}
13:30–14:30 — Domain

Crear:

domain/
├── entities/
│ └── ticket.entity.ts
├── enums/
│ ├── ticket-status.enum.ts
│ ├── ticket-priority.enum.ts
│ ├── ticket-category.enum.ts
│ └── ticket-sentiment.enum.ts
│
└── repositories/
└── ticket.repository.ts

Aquí introduces la primera abstracción importante:

export interface TicketRepository {
create(ticket: Ticket): Promise<Ticket>;

findById(id: string): Promise<Ticket | null>;
}
14:30–16:00 — CQRS

Implementar:

CreateTicketCommand
CreateTicketHandler

Flujo:

POST /tickets
│
▼
Controller
│
▼
CommandBus
│
▼
CreateTicketHandler
│
▼
TicketRepository

Implementar después:

GetTicketQuery
GetTicketHandler
16:00–17:00 — Supabase Repository

Implementar:

SupabaseTicketRepository

que implemente:

TicketRepository

Arquitectura:

CreateTicketHandler
│
▼
TicketRepository
▲
│
SupabaseTicketRepository
│
▼
Supabase
17:00–18:00 — RabbitMQ Publisher

Crear:

interface MessagePublisher {
publish(event: DomainEvent): Promise<void>;
}

Implementación:

RabbitMQMessagePublisher

Y modificar:

CreateTicketHandler

para hacer:

1. Crear ticket
2. Guardar en Supabase
3. Publicar ticket.created
   🎯 Fin del Día 1

Debes poder ejecutar:

curl POST /tickets

y observar:

Supabase
│
└── ticket creado

RabbitMQ
│
└── ticket.created

No avances a IA hasta que esto funcione.

🗓️ Día 2 — OpenCode + Agent + Async Processing

Este es el día donde el proyecto empieza a diferenciarse.

09:00–10:00 — AI Abstraction

Crear:

application/
└── ports/
└── ai-provider.interface.ts
export interface AIProvider {
analyzeTicket(
ticket: Ticket,
): Promise<TicketAnalysis>;
}

Esto es fundamental.

Tu aplicación no debe saber si utilizas:

OpenCode
OpenAI
Anthropic
Gemini
Mock
10:00–11:30 — OpenCode Zen Adapter

Crear:

infrastructure/
└── ai/
└── opencode/
└── opencode-zen.adapter.ts
AIProvider
▲
│
OpenCodeZenAdapter
│
▼
OpenCode Zen API

Configuración:

AI_API_KEY=
AI_BASE_URL=
AI_MODEL=

La ventaja es que posteriormente puedes agregar:

OpenAIAdapter
AnthropicAdapter
MockAIAdapter

sin tocar AnalyzeTicketHandler.

11:30–12:30 — Structured AI Output

Define:

interface TicketAnalysis {
category: TicketCategory;
priority: TicketPriority;
sentiment: TicketSentiment;
confidence: number;
suggestedResponse: string;
}

El modelo debe devolver JSON estructurado.

Ejemplo:

{
"category": "ORDER",
"priority": "HIGH",
"sentiment": "FRUSTRATED",
"confidence": 0.94,
"suggestedResponse": "We apologize for the delay..."
}

Después validas la respuesta antes de guardarla.

Esto es importante porque:

No confíes ciegamente en la salida del LLM.

13:30–14:30 — RabbitMQ Consumer

Crear:

TicketCreatedConsumer

Flujo:

RabbitMQ
│
▼
ticket.created
│
▼
TicketCreatedConsumer
│
▼
AnalyzeTicketCommand
│
▼
AnalyzeTicketHandler

Esto conecta:

RabbitMQ + CQRS.

14:30–16:00 — AnalyzeTicketHandler

Crear:

AnalyzeTicketCommand
AnalyzeTicketHandler

El handler:

1. Busca ticket
2. Cambia status → PROCESSING
3. Llama AIProvider
4. Obtiene TicketAnalysis
5. Guarda análisis
6. Cambia status → ANALYZED

Quedaría:

AnalyzeTicketHandler
│
├── TicketRepository
│
└── AIProvider
│
▼
OpenCodeZenAdapter
16:00–17:00 — AI Agent

Aquí no intentaría construir un agente complejo.

Haz:

SupportAgent

con herramientas:

TicketClassifierTool
PriorityAnalyzerTool
SentimentAnalyzerTool
ResponseGeneratorTool

Todas implementando:

interface AgentTool {
name: string;

execute(
input: AgentToolInput,
): Promise<AgentToolOutput>;
}

Puedes incluso comenzar con una única llamada estructurada al modelo y mantener las tools como una capa extensible.

La arquitectura queda:

SupportAgent
│
├── Classification
├── Priority
├── Sentiment
└── Response
17:00–18:00 — Retry + DLQ

Ahora sí.

ticket.ai.processing
│
▼
Worker
│
├── OK → ACK
│
└── ERROR
│
▼
Retry
│
▼
DLQ

Esto es mucho más interesante que simplemente decir:

"Usamos RabbitMQ."

Puedes demostrar resiliencia en mensajería.

🎯 Fin del Día 2

Este flujo debe estar completamente funcional:

POST /tickets
│
▼
CreateTicket
│
├──────► Supabase
│
└──────► RabbitMQ
│
▼
AI Consumer
│
▼
AnalyzeTicket
│
▼
AIProvider
│
▼
OpenCodeZenAdapter
│
▼
OpenCode Zen
│
▼
TicketAnalysis
│
▼
Supabase

🔥 Este es el core de tu proyecto.

🗓️ Día 3 — Frontend + Testing + Polish

El tercer día debe ser mucho menos arriesgado.

09:00–11:00 — Dashboard Next.js

Crear la estructura del frontend basada en [Frontend Architecture](frontend-architecture.md):

apps/web/src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── tickets/
│       ├── page.tsx
│       ├── new/
│       │   └── page.tsx
│       └── [id]/
│           └── page.tsx
├── components/
│   ├── layout/Header.tsx
│   ├── tickets/
│   │   ├── TicketList.tsx
│   │   ├── TicketCard.tsx
│   │   ├── TicketStatusBadge.tsx
│   │   └── TicketPriorityBadge.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Badge.tsx
├── features/tickets/
│   ├── api/tickets.api.ts
│   ├── hooks/use-tickets.ts
│   ├── hooks/use-ticket.ts
│   └── types/ticket.types.ts
├── lib/api/client.ts
├── types/api.types.ts
└── config/env.ts

Dashboard objetivo:

┌──────────────────────────────────────────┐
│ AI Support Desk │
├──────────────────────────────────────────┤
│ │
│ Tickets + New │
│ │
│ #123 │ Order delayed │ HIGH │ ANALYZED │
│ #124 │ Refund │ MED │ PROCESSING│
│ #125 │ Login issue │ LOW │ ANALYZED │
│ │
└──────────────────────────────────────────┘

Reglas para esta sesión:
- `app/` solo define rutas, no lógica de negocio.
- Los datos se obtienen a través de `features/tickets/api/tickets.api.ts` usando `lib/api/client.ts`.
- Los componentes reutilizables van en `components/ui/`.
- Los tipos de ticket viven en `features/tickets/types/ticket.types.ts`.
11:00–12:00 — Create Ticket

Formulario:

Customer
Title
Description

Al crear:

PROCESSING

Después:

ANALYZED
13:00–14:00 — Ticket Detail

Mostrar:

Customer message

Status
Category
Priority
Sentiment
Confidence

AI Suggested Response

Ejemplo:

Priority
████████ HIGH

Sentiment
😡 FRUSTRATED

Category
📦 ORDER

AI Confidence
94%

Suggested Response
─────────────────────
We apologize for the delay...

Esto hará que la demo sea visualmente mucho más convincente.

14:00–15:30 — Tests

Prioridad:

CreateTicketHandler
✓ creates ticket
✓ publishes event
AnalyzeTicketHandler
✓ retrieves ticket
✓ calls AIProvider
✓ persists analysis
✓ updates status
OpenCodeZenAdapter
✓ maps AI response
✓ validates structured output
Consumer
✓ processes ticket.created
✓ handles failure
15:30–16:30 — Demo Hardening

Probar:

✓ Ticket creation
✓ RabbitMQ event
✓ AI processing
✓ Supabase persistence
✓ Frontend update
✓ Invalid ticket
✓ AI failure
✓ RabbitMQ retry
✓ DLQ
16:30–17:30 — Documentation

Actualizar:

README.md
docs/architecture.md
docs/patterns.md
AGENTS.md

Especialmente patterns.md para que los patrones reflejen el código real.

17:30–18:00 — Demo final

Tu demo debería durar unos 5–7 minutos.

1. Crear ticket
   "My order hasn't arrived after 5 days"
2. Mostrar PROCESSING
   Ticket created
   Status: PROCESSING
3. RabbitMQ

Mostrar:

ticket.created 4. AI

Mostrar:

AI processing 5. Resultado
Category: ORDER
Priority: HIGH
Sentiment: FRUSTRATED
Confidence: 94% 6. Mostrar arquitectura

Explicar:

Controller
↓
CQRS
↓
Repository
↓
Supabase

        +

RabbitMQ
↓
Consumer
↓
AIProvider
↓
OpenCodeZenAdapter
↓
OpenCode
🧠 Lo que vas a poder defender técnicamente

Este proyecto te deja una historia arquitectónica bastante buena.

Abstracción
AIProvider
Interface
TicketRepository
MessagePublisher
AgentTool
AIProvider
Polimorfismo
AIProvider
├── OpenCodeZenAdapter
└── MockAIAdapter
Adapter
OpenCodeZenAdapter
Strategy
TicketClassificationStrategy
Factory
AIProviderFactory
Singleton

NestJS DI container.

CQRS
Commands
Queries
Event Driven
ticket.created
Messaging
RabbitMQ
Resiliencia
Retry + DLQ
AI
SupportAgent
Persistence
Supabase/PostgreSQL
Frontend
Next.js
🗓️ Día 4 — Structured Logging ✅ Completado

Este día se completó con éxito.

Objetivo:

Implementar logs estructurados en JSON para toda la aplicación,
permitiendo debugging eficiente y preparación para integración
con herramientas externas (ELK, Datadog, etc.).

09:00–10:00 — Logger Infrastructure

Instalar:

winston
winston-daily-rotate-file

Crear:

infrastructure/
└── logging/
    ├── logger.interface.ts
    ├── logger.service.ts
    ├── logger.module.ts
    └── winston.config.ts

Definir interfaz:

export const LOGGER = Symbol('LOGGER');

export interface Logger {
  debug(message: string, metadata?: Record<string, any>): void;
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, metadata?: Record<string, any>): void;
}

Configurar Winston:

- Formato JSON estructurado
- Console transport (desarrollo y producción)
- Daily rotate file (producción)
  ├── error-%DATE%.log (solo errores)
  └── combined-%DATE%.log (todos los niveles)
- Niveles por entorno:
  ├── development: debug
  └── production: info

10:00–11:00 — Integración en Handlers

Inyectar Logger en:

- CreateTicketHandler
- GetTicketHandler
- AnalyzeTicketHandler (Día 2)

Ejemplo de uso:

this.logger.info('Ticket created', {
  ticketId: ticket.id,
  customerId: ticket.customerId,
  status: ticket.status,
});

Ejemplo de log generado:

{
  "timestamp": "2026-08-22T09:00:00.000Z",
  "level": "info",
  "message": "Ticket created",
  "context": "CreateTicketHandler",
  "metadata": {
    "ticketId": "uuid-ticket",
    "customerId": "customer-123",
    "status": "PROCESSING"
  }
}

11:00–12:00 — Integración en Infrastructure

Inyectar Logger en:

- SupabaseTicketRepository
- RabbitMQMessagePublisher
- OpenCodeZenAdapter (Día 2)

Ejemplos:

Repository:
this.logger.info('Ticket persisted', { ticketId, duration });

Publisher:
this.logger.info('Event published', { eventType, eventId });

Adapter:
this.logger.info('AI analysis completed', { ticketId, confidence });

12:00–13:00 — Integración en Controllers

Agregar logging de request/response:

- Request: método, ruta, body (sin datos sensibles)
- Response: status code, duración
- Errores: stack trace completo

Ejemplo:

this.logger.info('Incoming request', {
  method: 'POST',
  path: '/tickets',
  body: { customerId, title },
});

this.logger.info('Response sent', {
  statusCode: 201,
  duration: 45,
});

13:00–14:00 — Error Handling con Logger

Crear ExceptionFilter global que:

- Capture todas las excepciones
- Loguee errores con contexto completo
- Incluya stack trace
- Retorne respuesta apropiada al cliente

Ejemplo de log de error:

{
  "timestamp": "2026-08-22T13:00:00.000Z",
  "level": "error",
  "message": "Failed to create ticket",
  "context": "CreateTicketHandler",
  "metadata": {
    "error": "Database connection failed",
    "stack": "...",
    "command": { "customerId": "customer-123" }
  }
}

14:00–15:00 — Validación con Zod ✅ Completado

Instalar:

zod

Crear:

infrastructure/
└── ai/
    └── opencode/
        └── opencode-response.schema.ts

Definir schema para validar la respuesta de OpenCode:

import { z } from 'zod';

export const OpenCodeResponseSchema = z.object({
  category: z.enum(['ORDER', 'BILLING', 'TECHNICAL', 'ACCOUNT', 'GENERAL']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'FRUSTRATED', 'ANGRY']),
  confidence: z.number().min(0).max(1),
  suggestedResponse: z.string().min(1),
});

export type OpenCodeResponse = z.infer<typeof OpenCodeResponseSchema>;

Integrar en OpenCodeAdapter:

async getRawAnalysis(ticket: Ticket): Promise<OpenCodeResponse> {
  const prompt = this.buildPrompt(ticket);
  const rawResponse = await this.callAPI(prompt);
  
  const validationResult = OpenCodeResponseSchema.safeParse(rawResponse);
  
  if (!validationResult.success) {
    this.logger.error('Invalid OpenCode response', {
      ticketId: ticket.id,
      rawResponse,
      errors: validationResult.error.errors,
    });
    
    throw new Error(
      `Invalid OpenCode response: ${validationResult.error.message}`
    );
  }
  
  this.logger.info('OpenCode response validated', {
    ticketId: ticket.id,
    category: validationResult.data.category,
    priority: validationResult.data.priority,
  });
  
  return validationResult.data;
}

Simplificar las Tools:

Ahora las tools reciben OpenCodeResponse (ya validado) en lugar de Record<string, unknown>.

Antes (TicketClassifierTool):

async execute(input: AgentToolInput): Promise<AgentToolOutput> {
  const category = input.rawAnalysis.category as string;
  if (!category) throw new Error('Category not found');
  const validated = this.validateCategory(category);
  return { category: validated };
}

Después:

async execute(input: AgentToolInput): Promise<AgentToolOutput> {
  // rawAnalysis ya está validado por Zod
  return { category: input.rawAnalysis.category };
}

Beneficios de Zod:

- Validación en runtime (no solo en compilación)
- Type inference automática
- Mensajes de error descriptivos
- Código más simple en las tools
- Schema centralizado (no duplicado)

15:00–16:00 — DLQ Management Endpoints ✅ Completado

Crear endpoints administrativos para inspeccionar y reprocesar mensajes en la Dead Letter Queue.

Endpoints:

GET    /admin/dlq                       - Listar mensajes en DLQ
GET    /admin/dlq/:messageId            - Obtener detalle de un mensaje
POST   /admin/dlq/:messageId/reprocess  - Reprocesar un mensaje
POST   /admin/dlq/reprocess-all         - Reprocesar todos los mensajes
DELETE /admin/dlq/:messageId            - Eliminar un mensaje

Estructura:

presentation/controllers/admin/
└── dlq.controller.ts

application/services/
└── dlq-management.service.ts

infrastructure/messaging/rabbitmq/
└── rabbitmq-dlq.service.ts

Implementación:

Usar AMQP con patrón get+nack para inspeccionar mensajes sin consumirlos permanentemente.

Ejemplo de respuesta:

{
  "messages": [
    {
      "id": "message-id",
      "content": { "ticketId": "uuid" },
      "headers": {
        "x-retry-count": 3,
        "x-last-error": "OpenCode API error",
        "x-last-error-at": "2026-08-22T14:30:00.000Z",
        "x-original-queue": "ticket.ai.processing"
      },
      "timestamp": "2026-08-22T14:30:05.000Z"
    }
  ],
  "total": 5
}

Autenticación JWT:

Proteger endpoints con JWT:

@UseGuards(JwtAuthGuard)
@Controller('admin/dlq')
export class DLQController { ... }

Flujo de reprocesamiento:

1. Obtener mensaje de DLQ (get con noAck: false)
2. Enviar de vuelta a cola principal (sendToQueue)
3. Acknowledge el mensaje de DLQ (ack)
4. Agregar header "x-reprocessed: true"

Beneficios de DLQ Endpoints:

- Debugging de mensajes fallidos
- Reprocesamiento después de arreglar errores
- Observabilidad del sistema
- Operaciones administrativas sin acceso a RabbitMQ UI

Nice to Have (si hay tiempo):

- Paginación avanzada
- Filtros por error específico
- Filtros por fecha
- Ordenamiento por timestamp
- Estadísticas de errores

🎯 Fin del Día 4

Resultado:

logs/
├── error-2026-08-22.log
├── combined-2026-08-22.log

Beneficios:

- Debugging eficiente con logs estructurados
- Historial de errores con rotación automática
- Preparado para integración con ELK/Datadog
- Trazabilidad completa del flujo de tickets
- Validación robusta de respuestas de IA con Zod
- Type-safety end-to-end (compilación + runtime)
- Endpoints administrativos para gestionar DLQ
- Operaciones de debugging y reprocesamiento

⚠️ Una modificación importante al alcance

Yo pondría estas funcionalidades como P0/P1/P2 para que no te quedes atrapado en algo secundario.

Funcionalidad Prioridad
NestJS API ✅ Completado
Supabase ✅ Completado
CQRS ✅ Completado
RabbitMQ ✅ Completado
OpenCode Adapter ✅ Completado
AI Analysis ✅ Completado
Persistir Analysis ✅ Completado
Next.js Dashboard ✅ Completado
Repository ✅ Completado
Interfaces ✅ Completado
Retry/DLQ ✅ Completado
Agent Tools ✅ Completado
Strategy ✅ Completado
Factory ✅ Completado
Tests ✅ Completado (209 backend + 67 frontend)
~~Structured Logging 🟢 P2~~ ✅ Completado (Winston + Interceptor + Console cleanup)
Authentication 🟢 P2
RAG 🟢 P2
~~WebSockets 🟢 P2~~ ✅ Completado via SSE
~~DLQ Management Endpoints 🟢 P2~~ ✅ Completado (CRUD + SSE)
Multi-agent 🟢 P2

Si te quedas sin tiempo, corta de abajo hacia arriba.

No sacrifiques:

CQRS +
RabbitMQ +
Supabase +
AIProvider +
OpenCode Adapter +
Next.js

Esas seis piezas son las que hacen que el proyecto tenga una historia técnica fuerte.

---

## Resumen de Implementación

### Funcionalidades Completadas

| Día | Funcionalidad | Estado |
|-----|---------------|--------|
| Día 1 | Monorepo + RabbitMQ + Supabase + Domain + CQRS + Repository + Publisher | ✅ |
| Día 2 | AI Provider + OpenCode Adapter + Zod Validation + Consumer + AnalyzeTicketHandler + Agent Tools + Retry/DLQ | ✅ |
| Día 3 | Next.js Dashboard + Create Ticket + Ticket Detail + Tests (209 backend + 67 frontend) | ✅ |
| Día 4 | Structured Logging (Winston + Interceptor) + Zod Validation + DLQ Management Endpoints + DLQ SSE + Demo Guide | ✅ |

### Stack Técnico Final

```text
Frontend:      Next.js 16 + React 19 + TypeScript + Tailwind CSS + Vitest
Backend:       NestJS 11 + TypeScript + CQRS + Clean Architecture + Jest
Database:      Supabase (PostgreSQL)
Messaging:     RabbitMQ + Retry + DLQ
AI:            OpenCode API + Agent Tools + Zod Validation
Logging:       Winston + Daily Rotate Files + Interceptor
Real-time:     SSE (Server-Sent Events)
Monorepo:      pnpm workspaces
```

### Estadísticas del Proyecto

| Métrica | Valor |
|---------|-------|
| Backend Tests | 209 passed |
| Frontend Tests | 67 passed |
| Coverage Backend | >90% |
| Coverage Frontend | >90% |
| Architecture | Clean Architecture + CQRS |
| Real-time | SSE (ticket.updated + dlq.change) |
| Messaging | RabbitMQ + Retry + DLQ |
| AI | OpenCode API + Agent Tools + Zod |
| Database | Supabase (PostgreSQL) |
| Frontend | Next.js 16 + React 19 |
| Documentation | 11 archivos .md |

### Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /tickets | Crear ticket |
| GET | /tickets | Listar tickets |
| GET | /tickets/:id | Obtener ticket |
| GET | /admin/dlq | Listar mensajes DLQ |
| GET | /admin/dlq/:messageId | Detalle mensaje DLQ |
| POST | /admin/dlq/:messageId/reprocess | Reprocesar mensaje |
| POST | /admin/dlq/reprocess-all | Reprocesar todos |
| DELETE | /admin/dlq/:messageId | Eliminar mensaje |
| GET | /events/tickets/stream | SSE ticket updates |
| GET | /events/dlq/stream | SSE DLQ changes
