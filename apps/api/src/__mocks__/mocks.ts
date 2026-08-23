import { Ticket } from '@domain/entities/ticket.entity';
import { TicketAnalysis } from '@domain/entities/ticket-analysis.entity';
import { TicketStatus } from '@domain/enums/ticket-status.enum';
import { TicketCategory } from '@domain/enums/ticket-category.enum';
import { TicketPriority } from '@domain/enums/ticket-priority.enum';
import { TicketSentiment } from '@domain/enums/ticket-sentiment.enum';
import type { TicketRepository } from '@domain/repositories/ticket.repository';
import type { MessagePublisher } from '@domain/events/message-publisher.interface';
import type { AIProvider } from '@application/ports/ai-provider.interface';

export function createMockTicket(overrides?: Partial<Ticket>): Ticket {
  return {
    id: 'test-ticket-id-123',
    customerId: 'customer-456',
    title: 'My order has not arrived',
    description: 'My order was supposed to arrive five days ago.',
    status: TicketStatus.PROCESSING,
    createdAt: new Date('2026-08-23T10:00:00.000Z'),
    updatedAt: new Date('2026-08-23T10:00:00.000Z'),
    ...overrides,
  };
}

export function createMockAnalysis(overrides?: Partial<TicketAnalysis>): TicketAnalysis {
  return {
    id: 'analysis-id-789',
    ticketId: 'test-ticket-id-123',
    category: TicketCategory.ORDER,
    priority: TicketPriority.HIGH,
    sentiment: TicketSentiment.FRUSTRATED,
    confidence: 0.94,
    suggestedResponse: 'We apologize for the delay in your order.',
    createdAt: new Date('2026-08-23T10:00:05.000Z'),
    ...overrides,
  };
}

export function createMockTicketRepository(): TicketRepository {
  return {
    create: jest.fn().mockImplementation((ticket: Ticket) => Promise.resolve(ticket)),
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockImplementation((id: string, data: Partial<Ticket>) =>
      Promise.resolve(createMockTicket({ id, ...data })),
    ),
    updateAnalysis: jest.fn().mockResolvedValue(undefined),
  };
}

export function createMockMessagePublisher(): MessagePublisher {
  return {
    publish: jest.fn().mockResolvedValue(undefined),
  };
}

export function createMockAIProvider(): AIProvider {
  return {
    analyzeTicket: jest.fn().mockResolvedValue(createMockAnalysis()),
  };
}
