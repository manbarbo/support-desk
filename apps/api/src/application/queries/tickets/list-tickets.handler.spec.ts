import { Test, TestingModule } from '@nestjs/testing';
import { ListTicketsHandler } from './list-tickets.handler';
import { ListTicketsQuery } from './list-tickets.query';
import { TICKET_REPOSITORY } from '@domain/repositories/ticket.repository';
import { TicketStatus } from '@domain/enums/ticket-status.enum';
import { TicketPriority } from '@domain/enums/ticket-priority.enum';
import { TicketCategory } from '@domain/enums/ticket-category.enum';
import {
  createMockTicket,
  createMockTicketRepository,
} from '../../../__mocks__/mocks';

describe('ListTicketsHandler', () => {
  let handler: ListTicketsHandler;
  let ticketRepository: ReturnType<typeof createMockTicketRepository>;

  beforeEach(async () => {
    ticketRepository = createMockTicketRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListTicketsHandler,
        { provide: TICKET_REPOSITORY, useValue: ticketRepository },
      ],
    }).compile();

    handler = module.get<ListTicketsHandler>(ListTicketsHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return all tickets when no filters provided', async () => {
      const mockTickets = [createMockTicket(), createMockTicket({ id: 'ticket-2' })];
      ticketRepository.findAll.mockResolvedValue(mockTickets);

      const result = await handler.execute(new ListTicketsQuery());

      expect(result).toEqual(mockTickets);
      expect(ticketRepository.findAll).toHaveBeenCalledWith({});
    });

    it('should filter by status', async () => {
      ticketRepository.findAll.mockResolvedValue([]);

      await handler.execute(new ListTicketsQuery({ status: 'ANALYZED' }));

      expect(ticketRepository.findAll).toHaveBeenCalledWith({
        status: TicketStatus.ANALYZED,
      });
    });

    it('should filter by priority', async () => {
      ticketRepository.findAll.mockResolvedValue([]);

      await handler.execute(new ListTicketsQuery({ priority: 'HIGH' }));

      expect(ticketRepository.findAll).toHaveBeenCalledWith({
        priority: TicketPriority.HIGH,
      });
    });

    it('should filter by category', async () => {
      ticketRepository.findAll.mockResolvedValue([]);

      await handler.execute(new ListTicketsQuery({ category: 'ORDER' }));

      expect(ticketRepository.findAll).toHaveBeenCalledWith({
        category: TicketCategory.ORDER,
      });
    });

    it('should filter by customerId', async () => {
      ticketRepository.findAll.mockResolvedValue([]);

      await handler.execute(new ListTicketsQuery({ customerId: 'customer-123' }));

      expect(ticketRepository.findAll).toHaveBeenCalledWith({
        customerId: 'customer-123',
      });
    });

    it('should combine multiple filters', async () => {
      ticketRepository.findAll.mockResolvedValue([]);

      await handler.execute(
        new ListTicketsQuery({
          status: 'PROCESSING',
          priority: 'URGENT',
          category: 'TECHNICAL',
          customerId: 'customer-456',
        }),
      );

      expect(ticketRepository.findAll).toHaveBeenCalledWith({
        status: TicketStatus.PROCESSING,
        priority: TicketPriority.URGENT,
        category: TicketCategory.TECHNICAL,
        customerId: 'customer-456',
      });
    });

    it('should propagate repository errors', async () => {
      ticketRepository.findAll.mockRejectedValue(new Error('DB connection failed'));

      await expect(handler.execute(new ListTicketsQuery())).rejects.toThrow(
        'DB connection failed',
      );
    });
  });
});
