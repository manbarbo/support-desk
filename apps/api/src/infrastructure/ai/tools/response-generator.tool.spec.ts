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
});
