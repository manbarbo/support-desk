import { Test, TestingModule } from '@nestjs/testing';
import { SupportAgent } from './support-agent';
import { OpenCodeAdapter } from '@infrastructure/ai/opencode/opencode.adapter';
import { TicketClassifierTool } from '@infrastructure/ai/tools/ticket-classifier.tool';
import { PriorityAnalyzerTool } from '@infrastructure/ai/tools/priority-analyzer.tool';
import { SentimentAnalyzerTool } from '@infrastructure/ai/tools/sentiment-analyzer.tool';
import { ResponseGeneratorTool } from '@infrastructure/ai/tools/response-generator.tool';
import { createMockTicket } from '../../__mocks__/mocks';

describe('SupportAgent', () => {
  let agent: SupportAgent;
  let openCodeAdapter: { getRawAnalysis: jest.Mock };
  let classifierTool: { execute: jest.Mock };
  let priorityTool: { execute: jest.Mock };
  let sentimentTool: { execute: jest.Mock };
  let responseTool: { execute: jest.Mock };

  beforeEach(async () => {
    openCodeAdapter = { getRawAnalysis: jest.fn() };
    classifierTool = { execute: jest.fn() };
    priorityTool = { execute: jest.fn() };
    sentimentTool = { execute: jest.fn() };
    responseTool = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportAgent,
        { provide: OpenCodeAdapter, useValue: openCodeAdapter },
        { provide: TicketClassifierTool, useValue: classifierTool },
        { provide: PriorityAnalyzerTool, useValue: priorityTool },
        { provide: SentimentAnalyzerTool, useValue: sentimentTool },
        { provide: ResponseGeneratorTool, useValue: responseTool },
      ],
    }).compile();

    agent = module.get<SupportAgent>(SupportAgent);
  });

  it('should be defined', () => {
    expect(agent).toBeDefined();
  });

  describe('analyzeTicket', () => {
    const mockTicket = createMockTicket();

    const mockRawAnalysis = {
      category: 'ORDER',
      priority: 'HIGH',
      sentiment: 'FRUSTRATED',
      confidence: 0.94,
      suggestedResponse: 'We apologize for the delay.',
    };

    beforeEach(() => {
      openCodeAdapter.getRawAnalysis.mockResolvedValue(mockRawAnalysis);
      classifierTool.execute.mockResolvedValue({ category: 'ORDER' });
      priorityTool.execute.mockResolvedValue({ priority: 'HIGH' });
      sentimentTool.execute.mockResolvedValue({ sentiment: 'FRUSTRATED' });
      responseTool.execute.mockResolvedValue({
        suggestedResponse: 'We apologize for the delay.',
        confidence: 0.94,
      });
    });

    it('should call OpenCodeAdapter with the ticket', async () => {
      await agent.analyzeTicket(mockTicket);

      expect(openCodeAdapter.getRawAnalysis).toHaveBeenCalledWith(mockTicket);
    });

    it('should execute all tools in parallel', async () => {
      await agent.analyzeTicket(mockTicket);

      expect(classifierTool.execute).toHaveBeenCalledWith(
        expect.objectContaining({ ticket: mockTicket, rawAnalysis: mockRawAnalysis }),
      );
      expect(priorityTool.execute).toHaveBeenCalledWith(
        expect.objectContaining({ ticket: mockTicket, rawAnalysis: mockRawAnalysis }),
      );
      expect(sentimentTool.execute).toHaveBeenCalledWith(
        expect.objectContaining({ ticket: mockTicket, rawAnalysis: mockRawAnalysis }),
      );
      expect(responseTool.execute).toHaveBeenCalledWith(
        expect.objectContaining({ ticket: mockTicket, rawAnalysis: mockRawAnalysis }),
      );
    });

    it('should return a TicketAnalysis with correct fields', async () => {
      const result = await agent.analyzeTicket(mockTicket);

      expect(result).toEqual(
        expect.objectContaining({
          ticketId: mockTicket.id,
          category: 'ORDER',
          priority: 'HIGH',
          sentiment: 'FRUSTRATED',
          confidence: 0.94,
          suggestedResponse: 'We apologize for the delay.',
        }),
      );
    });

    it('should generate a unique id for the analysis', async () => {
      const result = await agent.analyzeTicket(mockTicket);

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
    });

    it('should include a createdAt timestamp', async () => {
      const before = new Date();
      const result = await agent.analyzeTicket(mockTicket);
      const after = new Date();

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should propagate OpenCodeAdapter errors', async () => {
      openCodeAdapter.getRawAnalysis.mockRejectedValue(new Error('API timeout'));

      await expect(agent.analyzeTicket(mockTicket)).rejects.toThrow('API timeout');
    });

    it('should propagate tool errors', async () => {
      classifierTool.execute.mockRejectedValue(new Error('Invalid category'));

      await expect(agent.analyzeTicket(mockTicket)).rejects.toThrow('Invalid category');
    });
  });
});
