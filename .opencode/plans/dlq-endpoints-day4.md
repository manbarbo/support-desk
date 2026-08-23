# Plan: Agregar DLQ Management Endpoints al Día 4

## Contexto

El usuario quiere agregar una nueva sección al Día 4 del development plan para implementar endpoints administrativos que permitan inspeccionar y gestionar la Dead Letter Queue (DLQ) de RabbitMQ.

## Decisiones Confirmadas

- ✅ **Implementación**: AMQP con patrón get+nack
- ✅ **Autenticación**: JWT
- ✅ **Paginación/Filtros**: Nice to have (no requerido inicialmente)

## Cambios Propuestos al development-plan.md

### Ubicación

Insertar nueva sección después de la línea 871 (después de "Beneficios de Zod:") y antes de la línea 873 (antes de "🎯 Fin del Día 4").

### Contenido a Insertar

```markdown
15:00–16:00 — DLQ Management Endpoints

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
```

### Actualización del Resumen Final

Agregar al final del Día 4, en la sección "Beneficios:":

```markdown
- Endpoints administrativos para gestionar DLQ
- Operaciones de debugging y reprocesamiento
```

## Consideraciones Técnicas

### Implementación AMQP

**Ventajas**:
- No requiere credenciales adicionales de RabbitMQ Management
- Usa la misma conexión existente
- Más simple de implementar

**Limitaciones**:
- Patrón get+nack puede tener problemas de concurrencia
- No es ideal para producción con alto tráfico
- Aceptable para herramienta administrativa de bajo uso

### Autenticación JWT

**Requisitos**:
- Implementar JwtAuthGuard (puede requerir @nestjs/jwt y @nestjs/passport)
- Configurar estrategia JWT
- Generar tokens para acceso administrativo

**Alternativa más simple**:
- Si JWT es muy complejo para el Día 4, considerar Basic Auth o API Key
- JWT puede ser implementado en el Día 3 si se necesita para el frontend

### Estructura de Archivos

```
apps/api/src/
├── presentation/
│   └── controllers/
│       └── admin/
│           └── dlq.controller.ts
├── application/
│   └── services/
│       └── dlq-management.service.ts
└── infrastructure/
    └── messaging/
        └── rabbitmq/
            └── rabbitmq-dlq.service.ts
```

### Actualización de Módulos

**AppModule** debe registrar:
- DLQController
- DLQManagementService
- RabbitMQDLQService

## Próximos Pasos

1. **Confirmar plan**: Revisar este documento y confirmar que es correcto
2. **Actualizar development-plan.md**: Aplicar los cambios propuestos
3. **Implementar**: Cuando el usuario llegue al Día 4, implementar los endpoints

## Preguntas Pendientes

1. ¿Prefieres implementar JWT en el Día 4 o usar una alternativa más simple (Basic Auth/API Key)?
2. ¿Quieres que los endpoints estén disponibles solo en desarrollo o también en producción?
3. ¿Necesitas documentación OpenAPI/Swagger para estos endpoints?
