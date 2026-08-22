import { Ticket } from '@domain/entities/ticket.entity';

export interface AgentToolInput {
  ticket: Ticket;
  rawAnalysis: Record<string, unknown>;
}

export interface AgentToolOutput {
  [key: string]: unknown;
}

export const AGENT_TOOL = Symbol('AGENT_TOOL');

export interface AgentTool {
  readonly name: string;
  execute(input: AgentToolInput): Promise<AgentToolOutput>;
}
