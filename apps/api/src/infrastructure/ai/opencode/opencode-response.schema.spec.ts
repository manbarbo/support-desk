import { OpenCodeResponseSchema } from './opencode-response.schema';

describe('OpenCodeResponseSchema', () => {
  it('should validate a correct response', () => {
    const validResponse = {
      category: 'ORDER',
      priority: 'HIGH',
      sentiment: 'FRUSTRATED',
      confidence: 0.94,
      suggestedResponse: 'We apologize for the delay.',
    };

    const result = OpenCodeResponseSchema.safeParse(validResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validResponse);
    }
  });

  it('should reject invalid category', () => {
    const result = OpenCodeResponseSchema.safeParse({
      category: 'INVALID',
      priority: 'HIGH',
      sentiment: 'FRUSTRATED',
      confidence: 0.94,
      suggestedResponse: 'We apologize.',
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid priority', () => {
    const result = OpenCodeResponseSchema.safeParse({
      category: 'ORDER',
      priority: 'CRITICAL',
      sentiment: 'FRUSTRATED',
      confidence: 0.94,
      suggestedResponse: 'We apologize.',
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid sentiment', () => {
    const result = OpenCodeResponseSchema.safeParse({
      category: 'ORDER',
      priority: 'HIGH',
      sentiment: 'HAPPY',
      confidence: 0.94,
      suggestedResponse: 'We apologize.',
    });

    expect(result.success).toBe(false);
  });

  it('should reject confidence below 0', () => {
    const result = OpenCodeResponseSchema.safeParse({
      category: 'ORDER',
      priority: 'HIGH',
      sentiment: 'FRUSTRATED',
      confidence: -0.1,
      suggestedResponse: 'We apologize.',
    });

    expect(result.success).toBe(false);
  });

  it('should reject confidence above 1', () => {
    const result = OpenCodeResponseSchema.safeParse({
      category: 'ORDER',
      priority: 'HIGH',
      sentiment: 'FRUSTRATED',
      confidence: 1.5,
      suggestedResponse: 'We apologize.',
    });

    expect(result.success).toBe(false);
  });

  it('should reject empty suggestedResponse', () => {
    const result = OpenCodeResponseSchema.safeParse({
      category: 'ORDER',
      priority: 'HIGH',
      sentiment: 'FRUSTRATED',
      confidence: 0.94,
      suggestedResponse: '',
    });

    expect(result.success).toBe(false);
  });

  it('should accept confidence at boundaries', () => {
    expect(OpenCodeResponseSchema.safeParse({
      category: 'ORDER',
      priority: 'HIGH',
      sentiment: 'FRUSTRATED',
      confidence: 0,
      suggestedResponse: 'Test',
    }).success).toBe(true);

    expect(OpenCodeResponseSchema.safeParse({
      category: 'ORDER',
      priority: 'HIGH',
      sentiment: 'FRUSTRATED',
      confidence: 1,
      suggestedResponse: 'Test',
    }).success).toBe(true);
  });

  it('should reject missing fields', () => {
    const result = OpenCodeResponseSchema.safeParse({
      category: 'ORDER',
    });

    expect(result.success).toBe(false);
  });
});
