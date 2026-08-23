import { Test, TestingModule } from '@nestjs/testing';
import { TicketClassifierTool } from './ticket-classifier.tool';
import { createMockTicket } from '../../../__mocks__/mocks';

describe('TicketClassifierTool', () => {
  let tool: TicketClassifierTool;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TicketClassifierTool],
    }).compile();

    tool = module.get<TicketClassifierTool>(TicketClassifierTool);
  });

  it('should be defined', () => {
    expect(tool).toBeDefined();
  });

  it('should have correct name', () => {
    expect(tool.name).toBe('TicketClassifierTool');
  });

  describe('execute', () => {
    it('should return the validated category', async () => {
      const result = await tool.execute({
        ticket: createMockTicket(),
        rawAnalysis: { category: 'ORDER' },
      });

      expect(result).toEqual({ category: 'ORDER' });
    });

    it('should handle all valid categories', async () => {
      const categories = ['ORDER', 'BILLING', 'TECHNICAL', 'ACCOUNT', 'GENERAL'];

      for (const category of categories) {
        const result = await tool.execute({
          ticket: createMockTicket(),
          rawAnalysis: { category },
        });
        expect(result).toEqual({ category });
      }
    });

    it('should throw when category is missing', async () => {
      await expect(
        tool.execute({
          ticket: createMockTicket(),
          rawAnalysis: {},
        }),
      ).rejects.toThrow('Category not found in raw analysis');
    });

    it('should throw when category is invalid', async () => {
      await expect(
        tool.execute({
          ticket: createMockTicket(),
          rawAnalysis: { category: 'INVALID_CATEGORY' },
        }),
      ).rejects.toThrow('Invalid category: INVALID_CATEGORY');
    });
  });
});
