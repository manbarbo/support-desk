import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import request from 'supertest';
import { TicketsController } from './tickets.controller';
import { CreateTicketHandler } from '@application/commands/tickets/create-ticket/create-ticket.handler';
import { AnalyzeTicketHandler } from '@application/commands/tickets/analize-ticket/analyze-ticket.handler';
import { GetTicketHandler } from '@application/queries/tickets/get-ticket.handler';
import { ListTicketsHandler } from '@application/queries/tickets/list-tickets.handler';
import { TicketDlqHandler } from '@application/handlers/ticket-dlq.handler';
import { TICKET_REPOSITORY } from '@domain/repositories/ticket.repository';
import { MESSAGE_PUBLISHER } from '@domain/events/message-publisher.interface';
import { AI_PROVIDER } from '@application/ports/ai-provider.interface';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import { TicketEventEmitterService } from '@application/services/ticket-event-emitter.service';
import { TicketStatus } from '@domain/enums/ticket-status.enum';
import {
  createMockTicket,
  createMockTicketRepository,
  createMockMessagePublisher,
  createMockAIProvider,
  createMockLogger,
} from '../../__mocks__/mocks';

describe('TicketsController (Integration)', () => {
  let app: INestApplication;
  let ticketRepository: ReturnType<typeof createMockTicketRepository>;
  let messagePublisher: ReturnType<typeof createMockMessagePublisher>;
  let ticketEventEmitter: { emitTicketUpdated: jest.Mock };
  let dlqHandler: TicketDlqHandler;

  beforeAll(async () => {
    ticketRepository = createMockTicketRepository();
    messagePublisher = createMockMessagePublisher();
    ticketEventEmitter = { emitTicketUpdated: jest.fn() };
    const logger = createMockLogger();

    dlqHandler = new TicketDlqHandler(
      ticketRepository,
      ticketEventEmitter as any,
      logger,
    );

    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [TicketsController],
      providers: [
        CreateTicketHandler,
        AnalyzeTicketHandler,
        GetTicketHandler,
        ListTicketsHandler,
        { provide: TICKET_REPOSITORY, useValue: ticketRepository },
        { provide: MESSAGE_PUBLISHER, useValue: messagePublisher },
        { provide: AI_PROVIDER, useValue: createMockAIProvider() },
        { provide: LOGGER, useValue: createMockLogger() },
        {
          provide: TicketEventEmitterService,
          useValue: ticketEventEmitter,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /tickets', () => {
    it('should create a ticket and return 201', async () => {
      ticketRepository.create.mockImplementation((ticket) =>
        Promise.resolve(ticket),
      );

      const response = await request(app.getHttpServer())
        .post('/tickets')
        .send({
          customerId: 'customer-123',
          title: 'My order has not arrived',
          description: 'It has been 5 days.',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        customerId: 'customer-123',
        title: 'My order has not arrived',
        status: 'PROCESSING',
      });
    });

    it('should persist the ticket to repository', async () => {
      ticketRepository.create.mockResolvedValue(createMockTicket());

      await request(app.getHttpServer())
        .post('/tickets')
        .send({
          customerId: 'customer-456',
          title: 'Refund request',
          description: 'I need a refund.',
        })
        .expect(201);

      expect(ticketRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should publish a TicketCreatedEvent', async () => {
      ticketRepository.create.mockResolvedValue(createMockTicket());

      await request(app.getHttpServer())
        .post('/tickets')
        .send({
          customerId: 'customer-789',
          title: 'Login issue',
          description: 'Cannot login.',
        })
        .expect(201);

      expect(messagePublisher.publish).toHaveBeenCalledTimes(1);
    });

    it('should return 500 when repository fails', async () => {
      ticketRepository.create.mockRejectedValue(new Error('DB error'));

      await request(app.getHttpServer())
        .post('/tickets')
        .send({
          customerId: 'customer-123',
          title: 'Test',
          description: 'Test',
        })
        .expect(500);
    });
  });

  describe('GET /tickets', () => {
    it('should return a list of tickets', async () => {
      const mockTickets = [
        createMockTicket({ id: 'ticket-1' }),
        createMockTicket({ id: 'ticket-2' }),
      ];
      ticketRepository.findAll.mockResolvedValue(mockTickets);

      const response = await request(app.getHttpServer())
        .get('/tickets')
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('should return empty array when no tickets exist', async () => {
      ticketRepository.findAll.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/tickets')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should pass query params as filters', async () => {
      ticketRepository.findAll.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/tickets?status=ANALYZED&priority=HIGH')
        .expect(200);

      expect(ticketRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ANALYZED',
          priority: 'HIGH',
        }),
      );
    });
  });

  describe('GET /tickets/:id', () => {
    it('should return a ticket by id', async () => {
      const mockTicket = createMockTicket({ id: 'ticket-123' });
      ticketRepository.findById.mockResolvedValue(mockTicket);

      const response = await request(app.getHttpServer())
        .get('/tickets/ticket-123')
        .expect(200);

      expect(response.body.id).toBe('ticket-123');
    });

    it('should return 404 when ticket is not found', async () => {
      ticketRepository.findById.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/tickets/nonexistent-id')
        .expect(404);
    });
  });

  describe('Full Lifecycle: Create -> DLQ -> Query FAILED', () => {
    it('should create ticket, process DLQ, and return FAILED via HTTP', async () => {
      const createdTicket = createMockTicket({ id: 'lifecycle-1' });
      ticketRepository.create.mockResolvedValue(createdTicket);

      const createResponse = await request(app.getHttpServer())
        .post('/tickets')
        .send({
          customerId: 'customer-1',
          title: 'Lifecycle test',
          description: 'Testing full lifecycle',
        })
        .expect(201);

      expect(createResponse.body.status).toBe('PROCESSING');

      ticketRepository.update.mockResolvedValue({
        ...createdTicket,
        status: TicketStatus.FAILED,
      });

      await dlqHandler.handleTicketDlq({
        ticketId: createResponse.body.id,
        timestamp: new Date().toISOString(),
      });

      ticketRepository.findById.mockResolvedValue({
        ...createdTicket,
        status: TicketStatus.FAILED,
      });

      const getResponse = await request(app.getHttpServer())
        .get(`/tickets/${createResponse.body.id}`)
        .expect(200);

      expect(getResponse.body.status).toBe('FAILED');
    });

    it('should emit SSE event when DLQ updates ticket', async () => {
      const createdTicket = createMockTicket({ id: 'sse-1' });
      ticketRepository.create.mockResolvedValue(createdTicket);

      await request(app.getHttpServer())
        .post('/tickets')
        .send({
          customerId: 'customer-sse',
          title: 'SSE test',
          description: 'Testing SSE',
        })
        .expect(201);

      ticketRepository.update.mockResolvedValue(createdTicket);

      await dlqHandler.handleTicketDlq({
        ticketId: 'sse-1',
        timestamp: new Date().toISOString(),
      });

      expect(ticketEventEmitter.emitTicketUpdated).toHaveBeenCalledWith(
        'sse-1',
        TicketStatus.FAILED,
      );
    });
  });
});
