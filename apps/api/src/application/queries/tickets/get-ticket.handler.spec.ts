import { Test, TestingModule } from '@nestjs/testing';
import { GetTicketHandler } from './get-ticket.handler';
import { GetTicketQuery } from './get-ticket.query';
import { TICKET_REPOSITORY } from '@domain/repositories/ticket.repository';
import { createMockTicket, createMockTicketRepository } from '../../../__mocks__/mocks';

describe('GetTicketHandler', () => {
  let handler: GetTicketHandler;
  let ticketRepository: ReturnType<typeof createMockTicketRepository>;

  beforeEach(async () => {
    ticketRepository = createMockTicketRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTicketHandler,
        { provide: TICKET_REPOSITORY, useValue: ticketRepository },
      ],
    }).compile();

    handler = module.get<GetTicketHandler>(GetTicketHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return a ticket when found', async () => {
      const mockTicket = createMockTicket();
      ticketRepository.findById.mockResolvedValue(mockTicket);

      const result = await handler.execute(new GetTicketQuery('test-ticket-id-123'));

      expect(result).toEqual(mockTicket);
      expect(ticketRepository.findById).toHaveBeenCalledWith('test-ticket-id-123');
    });

    it('should return null when ticket is not found', async () => {
      ticketRepository.findById.mockResolvedValue(null);

      const result = await handler.execute(new GetTicketQuery('nonexistent-id'));

      expect(result).toBeNull();
    });

    it('should propagate repository errors', async () => {
      ticketRepository.findById.mockRejectedValue(new Error('DB error'));

      await expect(
        handler.execute(new GetTicketQuery('test-id')),
      ).rejects.toThrow('DB error');
    });
  });
});
