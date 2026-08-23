import { Test, TestingModule } from '@nestjs/testing';
import { ResponseGeneratorTool } from './response-generator.tool';
import { createMockTicket } from '../../../__mocks__/mocks';

describe('ResponseGeneratorTool', () => {
  let tool: ResponseGeneratorTool;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseGeneratorTool],
    }).compile();

    tool = module.get<ResponseGeneratorTool>(ResponseGeneratorTool);
  });

  it('should be defined', () => {
    expect(tool).toBeDefined();
  });

  it('should have correct name', () => {
    expect(tool.name).toBe('ResponseGeneratorTool');
  });

  describe('execute', () => {
    it('should return suggestedResponse and confidence', async () => {
      const result = await tool.execute({
        ticket: createMockTicket(),
        rawAnalysis: {
          suggestedResponse: 'We apologize for the delay.',
          confidence: 0.94,
        },
      });

      expect(result).toEqual({
        suggestedResponse: 'We apologize for the delay.',
        confidence: 0.94,
      });
    });

    it('should throw when suggestedResponse is missing', async () => {
      await expect(
        tool.execute({
          ticket: createMockTicket(),
          rawAnalysis: { confidence: 0.9 },
        }),
      ).rejects.toThrow('Suggested response not found in raw analysis');
    });

    it('should throw when confidence is missing', async () => {
      await expect(
        tool.execute({
          ticket: createMockTicket(),
          rawAnalysis: { suggestedResponse: 'Hello' },
        }),
      ).rejects.toThrow('Confidence not found in raw analysis');
    });

    it('should throw when suggestedResponse is empty', async () => {
      await expect(
        tool.execute({
          ticket: createMockTicket(),
          rawAnalysis: { suggestedResponse: '   ', confidence: 0.9 },
        }),
      ).rejects.toThrow('Suggested response cannot be empty');
    });

    it('should throw when confidence is NaN', async () => {
      await expect(
        tool.execute({
          ticket: createMockTicket(),
          rawAnalysis: { suggestedResponse: 'Hello', confidence: 'abc' },
        }),
      ).rejects.toThrow('Invalid confidence');
    });

    it('should throw when confidence is below 0', async () => {
      await expect(
        tool.execute({
          ticket: createMockTicket(),
          rawAnalysis: { suggestedResponse: 'Hello', confidence: -0.1 },
        }),
      ).rejects.toThrow('Must be between 0 and 1');
    });

    it('should throw when confidence is above 1', async () => {
      await expect(
        tool.execute({
          ticket: createMockTicket(),
          rawAnalysis: { suggestedResponse: 'Hello', confidence: 1.5 },
        }),
      ).rejects.toThrow('Must be between 0 and 1');
    });

    it('should accept boundary confidence values', async () => {
      const result0 = await tool.execute({
        ticket: createMockTicket(),
        rawAnalysis: { suggestedResponse: 'Hello', confidence: 0 },
      });
      expect(result0.confidence).toBe(0);

      const result1 = await tool.execute({
        ticket: createMockTicket(),
        rawAnalysis: { suggestedResponse: 'Hello', confidence: 1 },
      });
      expect(result1.confidence).toBe(1);
    });
  });
});
