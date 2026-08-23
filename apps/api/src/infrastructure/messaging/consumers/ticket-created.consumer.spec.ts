import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { TicketCreatedConsumer } from './ticket-created.consumer';
import { RabbitMQConsumer } from '../rabbitmq/rabbitmq.consumer';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import type { ConsumeMessage } from 'amqplib';
import { createMockLogger } from '../../../__mocks__/mocks';

describe('TicketCreatedConsumer', () => {
  let consumer: TicketCreatedConsumer;
  let mockRabbitMQConsumer: { consume: jest.Mock };
  let mockCommandBus: { execute: jest.Mock };
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    mockRabbitMQConsumer = { consume: jest.fn().mockResolvedValue(undefined) };
    mockCommandBus = { execute: jest.fn().mockResolvedValue(undefined) };
    logger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketCreatedConsumer,
        { provide: RabbitMQConsumer, useValue: mockRabbitMQConsumer },
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: LOGGER, useValue: logger },
      ],
    }).compile();

    consumer = module.get<TicketCreatedConsumer>(TicketCreatedConsumer);
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should register a consumer with the correct queue and exchange', async () => {
      await consumer.onModuleInit();

      expect(mockRabbitMQConsumer.consume).toHaveBeenCalledWith(
        expect.objectContaining({
          queue: 'ticket.ai.processing',
          routingKey: 'ticket.created',
        }),
        expect.objectContaining({
          name: 'support.events',
        }),
        expect.any(Function),
      );
    });
  });

  describe('message processing', () => {
    let messageHandler: (message: ConsumeMessage) => Promise<void>;

    beforeEach(async () => {
      mockRabbitMQConsumer.consume.mockImplementation(
        (_config: any, _exchange: any, handler: any) => {
          messageHandler = handler;
          return Promise.resolve();
        },
      );

      await consumer.onModuleInit();
    });

    it('should parse the message and execute AnalyzeTicketCommand', async () => {
      const mockEvent = {
        eventType: 'ticket.created',
        eventId: 'event-123',
        aggregateId: 'ticket-456',
        occurredAt: '2026-08-23T10:00:00.000Z',
        payload: { id: 'ticket-456' },
      };

      const message: ConsumeMessage = {
        content: Buffer.from(JSON.stringify(mockEvent)),
        fields: {} as any,
        properties: {} as any,
      };

      await messageHandler(message);

      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: 'ticket-456',
        }),
      );
    });

    it('should log the received event', async () => {
      const mockEvent = {
        eventType: 'ticket.created',
        eventId: 'event-789',
        aggregateId: 'ticket-abc',
        occurredAt: '2026-08-23T10:00:00.000Z',
        payload: {},
      };

      const message: ConsumeMessage = {
        content: Buffer.from(JSON.stringify(mockEvent)),
        fields: {} as any,
        properties: {} as any,
      };

      await messageHandler(message);

      expect(logger.info).toHaveBeenCalledWith(
        'Received event',
        expect.objectContaining({
          context: 'TicketCreatedConsumer',
          eventType: 'ticket.created',
          eventId: 'event-789',
        }),
      );
    });

    it('should log success after processing', async () => {
      const mockEvent = {
        eventType: 'ticket.created',
        eventId: 'event-success',
        aggregateId: 'ticket-xyz',
        occurredAt: '2026-08-23T10:00:00.000Z',
        payload: {},
      };

      const message: ConsumeMessage = {
        content: Buffer.from(JSON.stringify(mockEvent)),
        fields: {} as any,
        properties: {} as any,
      };

      await messageHandler(message);

      expect(logger.info).toHaveBeenCalledWith(
        'Successfully processed event',
        expect.objectContaining({
          context: 'TicketCreatedConsumer',
          eventId: 'event-success',
        }),
      );
    });

    it('should propagate command execution errors', async () => {
      mockCommandBus.execute.mockRejectedValue(new Error('Command failed'));

      const mockEvent = {
        eventType: 'ticket.created',
        eventId: 'event-fail',
        aggregateId: 'ticket-fail',
        occurredAt: '2026-08-23T10:00:00.000Z',
        payload: {},
      };

      const message: ConsumeMessage = {
        content: Buffer.from(JSON.stringify(mockEvent)),
        fields: {} as any,
        properties: {} as any,
      };

      await expect(messageHandler(message)).rejects.toThrow('Command failed');
    });

    it('should handle invalid JSON gracefully', async () => {
      const message: ConsumeMessage = {
        content: Buffer.from('invalid json'),
        fields: {} as any,
        properties: {} as any,
      };

      await expect(messageHandler(message)).rejects.toThrow();
    });
  });
});
