import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DLQController } from './dlq.controller';
import { DLQManagementService } from '@application/services/dlq-management.service';

describe('DLQController', () => {
  let controller: DLQController;
  let mockDLQService: {
    listMessages: jest.Mock;
    getMessage: jest.Mock;
    reprocessMessage: jest.Mock;
    reprocessAll: jest.Mock;
    deleteMessage: jest.Mock;
  };

  beforeEach(async () => {
    mockDLQService = {
      listMessages: jest.fn().mockResolvedValue({ messages: [], total: 0 }),
      getMessage: jest.fn().mockResolvedValue(null),
      reprocessMessage: jest.fn().mockResolvedValue(true),
      reprocessAll: jest.fn().mockResolvedValue({ reprocessed: 0 }),
      deleteMessage: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DLQController],
      providers: [
        { provide: DLQManagementService, useValue: mockDLQService },
      ],
    }).compile();

    controller = module.get<DLQController>(DLQController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listMessages', () => {
    it('should return messages', async () => {
      const result = await controller.listMessages();

      expect(result).toEqual({ messages: [], total: 0 });
      expect(mockDLQService.listMessages).toHaveBeenCalled();
    });

    it('should pass limit parameter', async () => {
      await controller.listMessages('10');

      expect(mockDLQService.listMessages).toHaveBeenCalledWith(10);
    });
  });

  describe('getMessage', () => {
    it('should return message when found', async () => {
      const mockMessage = { id: 'msg-1', content: {} };
      mockDLQService.getMessage.mockResolvedValue(mockMessage);

      const result = await controller.getMessage('msg-1');

      expect(result).toEqual(mockMessage);
    });

    it('should throw NotFoundException when not found', async () => {
      mockDLQService.getMessage.mockResolvedValue(null);

      await expect(controller.getMessage('msg-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reprocessMessage', () => {
    it('should return success when reprocessed', async () => {
      const result = await controller.reprocessMessage('msg-1');

      expect(result).toEqual({
        success: true,
        message: 'Message msg-1 reprocessed successfully',
      });
    });

    it('should throw NotFoundException when not found', async () => {
      mockDLQService.reprocessMessage.mockResolvedValue(false);

      await expect(controller.reprocessMessage('msg-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reprocessAll', () => {
    it('should return reprocess result', async () => {
      mockDLQService.reprocessAll.mockResolvedValue({
        reprocessed: 5,
      });

      const result = await controller.reprocessAll();

      expect(result).toEqual({ success: true, reprocessed: 5 });
    });
  });

  describe('deleteMessage', () => {
    it('should return success when deleted', async () => {
      const result = await controller.deleteMessage('msg-1');

      expect(result).toEqual({
        success: true,
        message: 'Message msg-1 deleted successfully',
      });
    });

    it('should throw NotFoundException when not found', async () => {
      mockDLQService.deleteMessage.mockResolvedValue(false);

      await expect(controller.deleteMessage('msg-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
