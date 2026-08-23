import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { CreateTicketCommand } from '@application/commands/tickets/create-ticket.command';
import { GetTicketQuery } from '@application/queries/tickets/get-ticket.query';
import { ListTicketsQuery } from '@application/queries/tickets/list-tickets.query';
import { createMockTicket } from '../../__mocks__/mocks';

describe('TicketsController', () => {
  let controller: TicketsController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listTickets', () => {
    it('should return a list of tickets', async () => {
      const mockTickets = [createMockTicket()];
      queryBus.execute.mockResolvedValue(mockTickets);

      const result = await controller.listTickets();

      expect(result).toEqual(mockTickets);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.any(ListTicketsQuery),
      );
    });

    it('should pass filters to ListTicketsQuery', async () => {
      queryBus.execute.mockResolvedValue([]);

      await controller.listTickets('ANALYZED', 'HIGH', 'ORDER', 'customer-123');

      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            status: 'ANALYZED',
            priority: 'HIGH',
            category: 'ORDER',
            customerId: 'customer-123',
          },
        }),
      );
    });
  });

  describe('createTicket', () => {
    it('should create a ticket and return it', async () => {
      const mockTicket = createMockTicket();
      commandBus.execute.mockResolvedValue(mockTicket);

      const result = await controller.createTicket({
        customerId: 'customer-123',
        title: 'Test ticket',
        description: 'Test description',
      });

      expect(result).toEqual(mockTicket);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(CreateTicketCommand),
      );
    });

    it('should pass body data to CreateTicketCommand', async () => {
      commandBus.execute.mockResolvedValue(createMockTicket());

      await controller.createTicket({
        customerId: 'customer-456',
        title: 'My order',
        description: 'It is late',
      });

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'customer-456',
          title: 'My order',
          description: 'It is late',
        }),
      );
    });
  });

  describe('getTicket', () => {
    it('should return a ticket when found', async () => {
      const mockTicket = createMockTicket();
      queryBus.execute.mockResolvedValue(mockTicket);

      const result = await controller.getTicket('test-ticket-id-123');

      expect(result).toEqual(mockTicket);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.any(GetTicketQuery),
      );
    });

    it('should throw NotFoundException when ticket is not found', async () => {
      queryBus.execute.mockResolvedValue(null);

      await expect(controller.getTicket('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should pass the id to GetTicketQuery', async () => {
      queryBus.execute.mockResolvedValue(createMockTicket());

      await controller.getTicket('my-ticket-id');

      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'my-ticket-id' }),
      );
    });
  });
});
