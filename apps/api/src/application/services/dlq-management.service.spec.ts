import { Test, TestingModule } from '@nestjs/testing';
import { DLQManagementService } from './dlq-management.service';
import { RabbitMQDLQService } from '@infrastructure/messaging/rabbitmq/rabbitmq-dlq.service';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import { createMockLogger } from '../../__mocks__/mocks';

describe('DLQManagementService', () => {
  let service: DLQManagementService;
  let mockDLQService: {
    listMessages: jest.Mock;
    getMessage: jest.Mock;
    reprocessMessage: jest.Mock;
    reprocessAll: jest.Mock;
    deleteMessage: jest.Mock;
  };
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    mockDLQService = {
      listMessages: jest.fn().mockResolvedValue({ messages: [], total: 0 }),
      getMessage: jest.fn().mockResolvedValue(null),
      reprocessMessage: jest.fn().mockResolvedValue(true),
      reprocessAll: jest.fn().mockResolvedValue({ reprocessed: 0 }),
      deleteMessage: jest.fn().mockResolvedValue(true),
    };

    logger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DLQManagementService,
        { provide: RabbitMQDLQService, useValue: mockDLQService },
        { provide: LOGGER, useValue: logger },
      ],
    }).compile();

    service = module.get<DLQManagementService>(DLQManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listMessages', () => {
    it('should call dlqService.listMessages with default DLQ', async () => {
      await service.listMessages();

      expect(mockDLQService.listMessages).toHaveBeenCalledWith(
        'ticket.ai.processing.dlq',
        undefined,
      );
    });

    it('should pass limit parameter', async () => {
      await service.listMessages(10);

      expect(mockDLQService.listMessages).toHaveBeenCalledWith(
        'ticket.ai.processing.dlq',
        10,
      );
    });
  });

  describe('getMessage', () => {
    it('should find message by id from listMessages', async () => {
      const mockMessage = { id: 'msg-1', content: {} };
      mockDLQService.listMessages.mockResolvedValue({
        messages: [mockMessage],
        total: 1,
      });

      const result = await service.getMessage('msg-1');

      expect(result).toEqual(mockMessage);
      expect(mockDLQService.listMessages).toHaveBeenCalled();
    });

    it('should return null when message not found', async () => {
      mockDLQService.listMessages.mockResolvedValue({
        messages: [],
        total: 0,
      });

      const result = await service.getMessage('msg-999');

      expect(result).toBeNull();
    });
  });

  describe('reprocessMessage', () => {
    it('should call dlqService.reprocessMessage with target queue', async () => {
      await service.reprocessMessage('msg-1');

      expect(mockDLQService.reprocessMessage).toHaveBeenCalledWith(
        'ticket.ai.processing.dlq',
        'msg-1',
        'ticket.ai.processing',
      );
    });
  });

  describe('reprocessAll', () => {
    it('should call dlqService.reprocessAll', async () => {
      await service.reprocessAll();

      expect(mockDLQService.reprocessAll).toHaveBeenCalledWith(
        'ticket.ai.processing.dlq',
        'ticket.ai.processing',
        undefined,
      );
    });
  });

  describe('deleteMessage', () => {
    it('should call dlqService.deleteMessage', async () => {
      await service.deleteMessage('msg-1');

      expect(mockDLQService.deleteMessage).toHaveBeenCalledWith(
        'ticket.ai.processing.dlq',
        'msg-1',
      );
    });
  });
});
