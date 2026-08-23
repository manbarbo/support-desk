import { Test, TestingModule } from '@nestjs/testing';
import { SentimentAnalyzerTool } from './sentiment-analyzer.tool';
import { createMockTicket } from '../../../__mocks__/mocks';

describe('SentimentAnalyzerTool', () => {
  let tool: SentimentAnalyzerTool;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SentimentAnalyzerTool],
    }).compile();

    tool = module.get<SentimentAnalyzerTool>(SentimentAnalyzerTool);
  });

  it('should be defined', () => {
    expect(tool).toBeDefined();
  });

  it('should have correct name', () => {
    expect(tool.name).toBe('SentimentAnalyzerTool');
  });

  describe('execute', () => {
    it('should return the validated sentiment', async () => {
      const result = await tool.execute({
        ticket: createMockTicket(),
        rawAnalysis: { sentiment: 'FRUSTRATED' },
      });

      expect(result).toEqual({ sentiment: 'FRUSTRATED' });
    });

    it('should handle all valid sentiments', async () => {
      const sentiments = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'FRUSTRATED', 'ANGRY'];

      for (const sentiment of sentiments) {
        const result = await tool.execute({
          ticket: createMockTicket(),
          rawAnalysis: { sentiment },
        });
        expect(result).toEqual({ sentiment });
      }
    });

    it('should throw when sentiment is missing', async () => {
      await expect(
        tool.execute({
          ticket: createMockTicket(),
          rawAnalysis: {},
        }),
      ).rejects.toThrow('Sentiment not found in raw analysis');
    });

    it('should throw when sentiment is invalid', async () => {
      await expect(
        tool.execute({
          ticket: createMockTicket(),
          rawAnalysis: { sentiment: 'HAPPY' },
        }),
      ).rejects.toThrow('Invalid sentiment: HAPPY');
    });
  });
});
