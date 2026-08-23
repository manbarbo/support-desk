import { Test, TestingModule } from '@nestjs/testing';
import { CreateTicketHandler } from './create-ticket.handler';
import { CreateTicketCommand } from './create-ticket.command';
import { TICKET_REPOSITORY } from '@domain/repositories/ticket.repository';
import { MESSAGE_PUBLISHER } from '@domain/events/message-publisher.interface';
import { TicketStatus } from '@domain/enums/ticket-status.enum';
import {
  createMockTicketRepository,
  createMockMessagePublisher,
} from '../../../__mocks__/mocks';

describe('CreateTicketHandler', () => {
  let handler: CreateTicketHandler;
  let ticketRepository: ReturnType<typeof createMockTicketRepository>;
  let messagePublisher: ReturnType<typeof createMockMessagePublisher>;

  beforeEach(async () => {
    ticketRepository = createMockTicketRepository();
    messagePublisher = createMockMessagePublisher();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTicketHandler,
        { provide: TICKET_REPOSITORY, useValue: ticketRepository },
        { provide: MESSAGE_PUBLISHER, useValue: messagePublisher },
      ],
    }).compile();

    handler = module.get<CreateTicketHandler>(CreateTicketHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    const command = new CreateTicketCommand(
      'customer-123',
      'My order has not arrived',
      'It has been 5 days since I placed my order.',
    );

    it('should create a ticket with correct fields', async () => {
      const result = await handler.execute(command);

      expect(result.customerId).toBe('customer-123');
      expect(result.title).toBe('My order has not arrived');
      expect(result.description).toBe('It has been 5 days since I placed my order.');
      expect(result.status).toBe(TicketStatus.PROCESSING);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should call ticketRepository.create with the ticket', async () => {
      await handler.execute(command);

      expect(ticketRepository.create).toHaveBeenCalledTimes(1);
      expect(ticketRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'customer-123',
          title: 'My order has not arrived',
          status: TicketStatus.PROCESSING,
        }),
      );
    });

    it('should publish a TicketCreatedEvent', async () => {
      await handler.execute(command);

      expect(messagePublisher.publish).toHaveBeenCalledTimes(1);
      expect(messagePublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ticket.created',
          aggregateId: expect.any(String),
          payload: expect.objectContaining({
            customerId: 'customer-123',
            title: 'My order has not arrived',
          }),
        }),
      );
    });

    it('should return the created ticket from repository', async () => {
      const mockTicket = createMockTicket();
      ticketRepository.create.mockResolvedValue(mockTicket);

      const result = await handler.execute(command);

      expect(result).toEqual(mockTicket);
    });

    it('should propagate repository errors', async () => {
      ticketRepository.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(handler.execute(command)).rejects.toThrow('Database connection failed');
    });

    it('should generate a unique id for each ticket', async () => {
      const result1 = await handler.execute(command);
      const result2 = await handler.execute(command);

      expect(result1.id).not.toBe(result2.id);
    });
  });
});

// Import for the test above
import { createMockTicket } from '../../../__mocks__/mocks';
