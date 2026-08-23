import { Test, TestingModule } from '@nestjs/testing';
import { RabbitMQDLQService } from './rabbitmq-dlq.service';
import { RabbitMQConnection } from './rabbitmq.connection';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import { createMockLogger } from '../../../__mocks__/mocks';

describe('RabbitMQDLQService', () => {
  let service: RabbitMQDLQService;
  let mockConnection: { getChannel: jest.Mock };
  let mockChannel: any;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    mockChannel = {
      get: jest.fn(),
      nack: jest.fn(),
      ack: jest.fn(),
      sendToQueue: jest.fn(),
    };

    mockConnection = {
      getChannel: jest.fn().mockResolvedValue(mockChannel),
    };

    logger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitMQDLQService,
        { provide: RabbitMQConnection, useValue: mockConnection },
        { provide: LOGGER, useValue: logger },
      ],
    }).compile();

    service = module.get<RabbitMQDLQService>(RabbitMQDLQService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listMessages', () => {
    it('should return empty array when no messages', async () => {
      mockChannel.get.mockResolvedValue(null);

      const result = await service.listMessages('test-queue');

      expect(result.messages).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return messages from the queue', async () => {
      const mockMessage = {
        content: Buffer.from(JSON.stringify({ ticketId: '123' })),
        properties: {
          messageId: 'msg-1',
          timestamp: Date.now(),
          headers: {
            'x-retry-count': 3,
            'x-last-error': 'Error',
            'x-last-error-at': '2026-01-01',
            'x-original-queue': 'original',
          },
        },
      };

      mockChannel.get
        .mockResolvedValueOnce(mockMessage)
        .mockResolvedValueOnce(null);

      const result = await service.listMessages('test-queue');

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toEqual({ ticketId: '123' });
      expect(result.messages[0].retryCount).toBe(3);
    });

    it('should respect limit parameter', async () => {
      const createMessage = (id: number) => ({
        content: Buffer.from(JSON.stringify({ id })),
        properties: {
          messageId: `msg-${id}`,
          timestamp: Date.now(),
          headers: {},
        },
      });

      mockChannel.get
        .mockResolvedValueOnce(createMessage(1))
        .mockResolvedValueOnce(createMessage(2))
        .mockResolvedValueOnce(null);

      const result = await service.listMessages('test-queue', 2);

      expect(result.messages).toHaveLength(2);
    });
  });

  describe('reprocessMessage', () => {
    it('should publish message to target queue and ack', async () => {
      const mockMessage = {
        content: Buffer.from(JSON.stringify({ ticketId: '123' })),
        properties: {
          messageId: 'msg-1',
          timestamp: Date.now(),
          headers: {},
        },
      };

      mockChannel.get.mockResolvedValue(mockMessage);

      const result = await service.reprocessMessage('dlq', 'msg-1', 'target-queue');

      expect(result).toBe(true);
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'target-queue',
        expect.any(Buffer),
        expect.objectContaining({ persistent: true }),
      );
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should return false when no message found', async () => {
      mockChannel.get.mockResolvedValue(null);

      const result = await service.reprocessMessage('dlq', 'msg-1', 'target-queue');

      expect(result).toBe(false);
    });
  });

  describe('deleteMessage', () => {
    it('should ack message to remove it from queue', async () => {
      const mockMessage = {
        content: Buffer.from(JSON.stringify({ ticketId: '123' })),
        properties: {
          messageId: 'msg-1',
          timestamp: Date.now(),
          headers: {},
        },
      };

      mockChannel.get.mockResolvedValue(mockMessage);

      const result = await service.deleteMessage('dlq', 'msg-1');

      expect(result).toBe(true);
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should return false when no message found', async () => {
      mockChannel.get.mockResolvedValue(null);

      const result = await service.deleteMessage('dlq', 'msg-1');

      expect(result).toBe(false);
    });
  });
});
