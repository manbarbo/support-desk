import { Injectable } from '@nestjs/common';
import {
  AgentTool,
  AgentToolInput,
  AgentToolOutput,
} from '@application/ports/agent-tool.interface';

@Injectable()
export class ResponseGeneratorTool implements AgentTool {
  readonly name = 'ResponseGeneratorTool';

  async execute(input: AgentToolInput): Promise<AgentToolOutput> {
    const { rawAnalysis } = input;
    const suggestedResponse = rawAnalysis.suggestedResponse as string;
    const confidence = rawAnalysis.confidence as number;

    if (!suggestedResponse) {
      throw new Error('Suggested response not found in raw analysis');
    }

    if (confidence === undefined || confidence === null) {
      throw new Error('Confidence not found in raw analysis');
    }

    const validatedResponse = this.validateResponse(suggestedResponse);
    const validatedConfidence = this.validateConfidence(confidence);

    return {
      suggestedResponse: validatedResponse,
      confidence: validatedConfidence,
    };
  }

  private validateResponse(value: string): string {
    if (!value || value.trim().length === 0) {
      throw new Error('Suggested response cannot be empty');
    }
    return value;
  }

  private validateConfidence(value: number): number {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`Invalid confidence: ${value}. Must be a valid number`);
    }
    if (value < 0 || value > 1) {
      throw new Error(`Invalid confidence: ${value}. Must be between 0 and 1`);
    }
    return value;
  }
}
