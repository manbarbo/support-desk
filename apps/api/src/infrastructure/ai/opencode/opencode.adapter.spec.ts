import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenCodeAdapter } from './opencode.adapter';
import { createMockTicket } from '../../../__mocks__/mocks';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('OpenCodeAdapter', () => {
  let adapter: OpenCodeAdapter;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          AI_API_KEY: 'test-api-key',
          AI_BASE_URL: 'https://api.opencode.test',
          AI_MODEL: 'test-model',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenCodeAdapter,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    adapter = module.get<OpenCodeAdapter>(OpenCodeAdapter);
    mockFetch.mockClear();
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('constructor', () => {
    it('should throw if AI_API_KEY is missing', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'AI_API_KEY') return undefined;
        return 'value';
      });

      expect(() => new OpenCodeAdapter(configService as any)).toThrow(
        'AI configuration is incomplete',
      );
    });

    it('should throw if AI_BASE_URL is missing', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'AI_BASE_URL') return undefined;
        return 'value';
      });

      expect(() => new OpenCodeAdapter(configService as any)).toThrow(
        'AI configuration is incomplete',
      );
    });

    it('should throw if AI_MODEL is missing', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'AI_MODEL') return undefined;
        return 'value';
      });

      expect(() => new OpenCodeAdapter(configService as any)).toThrow(
        'AI configuration is incomplete',
      );
    });
  });

  describe('getRawAnalysis', () => {
    const mockTicket = createMockTicket();
    const mockAIResponse = {
      category: 'ORDER',
      priority: 'HIGH',
      sentiment: 'FRUSTRATED',
      confidence: 0.94,
      suggestedResponse: 'We apologize for the delay.',
    };

    it('should call the OpenCode API with correct parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify(mockAIResponse) } }],
        }),
      });

      await adapter.getRawAnalysis(mockTicket);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.opencode.test/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        }),
      );
    });

    it('should include ticket title and description in the prompt', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify(mockAIResponse) } }],
        }),
      });

      await adapter.getRawAnalysis(mockTicket);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const userMessage = body.messages[1].content;

      expect(userMessage).toContain(mockTicket.title);
      expect(userMessage).toContain(mockTicket.description);
    });

    it('should parse and return the AI response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify(mockAIResponse) } }],
        }),
      });

      const result = await adapter.getRawAnalysis(mockTicket);

      expect(result).toEqual(mockAIResponse);
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(adapter.getRawAnalysis(mockTicket)).rejects.toThrow(
        'OpenCode API error: 500 Internal Server Error',
      );
    });

    it('should throw on empty response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '' } }],
        }),
      });

      await expect(adapter.getRawAnalysis(mockTicket)).rejects.toThrow(
        'OpenCode returned an empty response',
      );
    });

    it('should throw on invalid JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'not valid json' } }],
        }),
      });

      await expect(adapter.getRawAnalysis(mockTicket)).rejects.toThrow(
        'Failed to parse OpenCode response',
      );
    });

    it('should use the configured model', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify(mockAIResponse) } }],
        }),
      });

      await adapter.getRawAnalysis(mockTicket);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model).toBe('test-model');
    });

    it('should use low temperature for deterministic output', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify(mockAIResponse) } }],
        }),
      });

      await adapter.getRawAnalysis(mockTicket);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.temperature).toBe(0.3);
    });
  });
});
