import { Test, TestingModule } from '@nestjs/testing';
import { PriorityAnalyzerTool } from './priority-analyzer.tool';
import { createMockTicket } from '../../../__mocks__/mocks';

describe('PriorityAnalyzerTool', () => {
  let tool: PriorityAnalyzerTool;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PriorityAnalyzerTool],
    }).compile();

    tool = module.get<PriorityAnalyzerTool>(PriorityAnalyzerTool);
  });

  it('should be defined', () => {
    expect(tool).toBeDefined();
  });

  it('should have correct name', () => {
    expect(tool.name).toBe('PriorityAnalyzerTool');
  });

  it('should return the priority from rawAnalysis', async () => {
    const result = await tool.execute({
      ticket: createMockTicket(),
      rawAnalysis: { priority: 'HIGH' },
    });

    expect(result).toEqual({ priority: 'HIGH' });
  });

  it('should handle all valid priorities', async () => {
    const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

    for (const priority of priorities) {
      const result = await tool.execute({
        ticket: createMockTicket(),
        rawAnalysis: { priority },
      });
      expect(result).toEqual({ priority });
    }
  });
});
