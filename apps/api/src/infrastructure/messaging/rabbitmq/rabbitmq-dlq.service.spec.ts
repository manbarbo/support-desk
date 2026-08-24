import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RabbitMQDLQService } from './rabbitmq-dlq.service';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import { createMockLogger } from '../../../__mocks__/mocks';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('RabbitMQDLQService', () => {
  let service: RabbitMQDLQService;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    logger = createMockLogger();
    mockFetch.mockReset();

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'BROKER_URL') return 'amqp://guest:guest@localhost:5672';
        if (key === 'RABBITMQ_USER') return 'guest';
        if (key === 'RABBITMQ_PASS') return 'guest';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitMQDLQService,
        { provide: ConfigService, useValue: configService },
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
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await service.listMessages('test-queue');

      expect(result.messages).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return parsed messages', async () => {
      const mockResponse = [
        {
          payload_bytes: 100,
          redelivered: false,
          exchange: '',
          routing_key: 'test-queue',
          message_count: 0,
          properties: {
            delivery_mode: 2,
            headers: {
              'x-retry-count': 3,
              'x-last-error': 'Error',
              'x-last-error-at': '2026-01-01',
              'x-original-queue': 'original',
            },
            content_type: 'application/json',
            message_id: 'msg-1',
            timestamp: Date.now(),
          },
          payload: JSON.stringify({ ticketId: '123' }),
          payload_encoding: 'string',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.listMessages('test-queue');

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toEqual({ ticketId: '123' });
      expect(result.messages[0].retryCount).toBe(3);
      expect(result.messages[0].id).toBe('msg-1');
    });

    it('should call Management API with correct parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await service.listMessages('test-queue', 10);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/queues/'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            count: 10,
            ackmode: 'ack_requeue_true',
            encoding: 'auto',
          }),
        }),
      );
    });
  });

  describe('getMessage', () => {
    it('should return message when found', async () => {
      const mockResponse = [
        {
          payload_bytes: 100,
          properties: {
            delivery_mode: 2,
            headers: {},
            content_type: 'application/json',
            message_id: 'msg-1',
          },
          payload: JSON.stringify({ ticketId: '123' }),
          payload_encoding: 'string',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.getMessage('test-queue', 'msg-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('msg-1');
    });

    it('should return null when not found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await service.getMessage('test-queue', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('reprocessMessage', () => {
    it('should publish message to target queue', async () => {
      const mockMessage = {
        payload_bytes: 100,
        properties: {
          delivery_mode: 2,
          headers: {},
          content_type: 'application/json',
          message_id: 'msg-1',
        },
        payload: JSON.stringify({ ticketId: '123' }),
        payload_encoding: 'string',
      };

      // First call: getMessages for finding by ID
      // Second call: getMessages for raw message
      // Third call: publish
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockMessage]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockMessage]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      const result = await service.reprocessMessage('dlq', 'msg-1', 'target-queue');

      expect(result).toBe(true);
    });

    it('should return false when message not found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await service.reprocessMessage('dlq', 'nonexistent', 'target-queue');

      expect(result).toBe(false);
    });
  });
});
