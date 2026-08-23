import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseService } from '../database/supabase.service';
import type { Database } from '../database/supabase.types';

import type {
  TicketRepository,
  TicketFilters,
  TicketAnalysisUpdate,
} from '@domain/repositories/ticket.repository';

import type { Ticket } from '@domain/entities/ticket.entity';

import { TicketCategory } from '@domain/enums/ticket-category.enum';
import { TicketPriority } from '@domain/enums/ticket-priority.enum';
import { TicketSentiment } from '@domain/enums/ticket-sentiment.enum';
import { TicketStatus } from '@domain/enums/ticket-status.enum';

import { LOGGER } from '@infrastructure/logging/logger.interface';
import type { Logger } from '@infrastructure/logging/logger.interface';

type TicketRow = Database['public']['Tables']['tickets']['Row'];
type TicketUpdate = Database['public']['Tables']['tickets']['Update'];

@Injectable()
export class SupabaseTicketRepository implements TicketRepository {
  private readonly supabase: SupabaseClient<Database>;

  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {
    this.supabase = this.supabaseService.getClient();
  }

  async create(ticket: Ticket): Promise<Ticket> {
    const start = Date.now();

    const { data, error } = await this.supabase
      .from('tickets')
      .insert({
        id: ticket.id,
        customer_id: ticket.customerId,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        sentiment: ticket.sentiment,
        confidence: ticket.confidence,
        suggested_response: ticket.suggestedResponse,
        created_at: ticket.createdAt.toISOString(),
        updated_at: ticket.updatedAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create ticket', {
        context: 'SupabaseTicketRepository',
        ticketId: ticket.id,
        error: error.message,
      });
      throw new Error(`Failed to create ticket: ${error.message}`);
    }

    const duration = Date.now() - start;

    this.logger.info('Ticket persisted', {
      context: 'SupabaseTicketRepository',
      ticketId: ticket.id,
      duration,
    });

    return this.mapToTicket(data);
  }

  async findById(id: string): Promise<Ticket | null> {
    const { data, error } = await this.supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }

      this.logger.error('Failed to find ticket', {
        context: 'SupabaseTicketRepository',
        ticketId: id,
        error: error.message,
      });
      throw new Error(`Failed to find ticket: ${error.message}`);
    }

    return data ? this.mapToTicket(data) : null;
  }

  async findAll(filters?: TicketFilters): Promise<Ticket[]> {
    let query = this.supabase.from('tickets').select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      this.logger.error('Failed to find tickets', {
        context: 'SupabaseTicketRepository',
        error: error.message,
      });
      throw new Error(`Failed to find tickets: ${error.message}`);
    }

    this.logger.debug('Tickets retrieved', {
      context: 'SupabaseTicketRepository',
      count: data.length,
      filters,
    });

    return data.map((row) => this.mapToTicket(row));
  }

  async update(id: string, ticket: Partial<Ticket>): Promise<Ticket> {
    const updateData: TicketUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (ticket.customerId !== undefined) {
      updateData.customer_id = ticket.customerId;
    }

    if (ticket.title !== undefined) {
      updateData.title = ticket.title;
    }

    if (ticket.description !== undefined) {
      updateData.description = ticket.description;
    }

    if (ticket.status !== undefined) {
      updateData.status = ticket.status;
    }

    if (ticket.priority !== undefined) {
      updateData.priority = ticket.priority;
    }

    if (ticket.category !== undefined) {
      updateData.category = ticket.category;
    }

    if (ticket.sentiment !== undefined) {
      updateData.sentiment = ticket.sentiment;
    }

    if (ticket.confidence !== undefined) {
      updateData.confidence = ticket.confidence;
    }

    if (ticket.suggestedResponse !== undefined) {
      updateData.suggested_response = ticket.suggestedResponse;
    }

    const { data, error } = await this.supabase
      .from('tickets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update ticket', {
        context: 'SupabaseTicketRepository',
        ticketId: id,
        error: error.message,
      });
      throw new Error(`Failed to update ticket: ${error.message}`);
    }

    this.logger.debug('Ticket updated', {
      context: 'SupabaseTicketRepository',
      ticketId: id,
      fields: Object.keys(updateData).filter((k) => k !== 'updated_at'),
    });

    return this.mapToTicket(data);
  }

  async updateAnalysis(
    id: string,
    analysis: TicketAnalysisUpdate,
  ): Promise<void> {
    const updateData: TicketUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (analysis.priority !== undefined) {
      updateData.priority = analysis.priority;
    }

    if (analysis.category !== undefined) {
      updateData.category = analysis.category;
    }

    if (analysis.sentiment !== undefined) {
      updateData.sentiment = analysis.sentiment;
    }

    if (analysis.confidence !== undefined) {
      updateData.confidence = analysis.confidence;
    }

    if (analysis.suggestedResponse !== undefined) {
      updateData.suggested_response = analysis.suggestedResponse;
    }

    if (analysis.status !== undefined) {
      updateData.status = analysis.status;
    }

    const { error } = await this.supabase
      .from('tickets')
      .update(updateData)
      .eq('id', id);

    if (error) {
      this.logger.error('Failed to update ticket analysis', {
        context: 'SupabaseTicketRepository',
        ticketId: id,
        error: error.message,
      });
      throw new Error(`Failed to update ticket analysis: ${error.message}`);
    }

    this.logger.debug('Ticket analysis persisted', {
      context: 'SupabaseTicketRepository',
      ticketId: id,
    });
  }

  private mapToTicket(row: TicketRow): Ticket {
    return {
      id: row.id,
      customerId: row.customer_id,
      title: row.title,
      description: row.description,
      status: this.mapStatus(row.status),
      priority: this.mapPriority(row.priority),
      category: this.mapCategory(row.category),
      sentiment: this.mapSentiment(row.sentiment),
      confidence: (row.confidence as number | null) ?? undefined,
      suggestedResponse: (row.suggested_response as string | null) ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapStatus(value: string): TicketStatus {
    if (!Object.values(TicketStatus).includes(value as TicketStatus)) {
      throw new Error(`Invalid ticket status: ${value}`);
    }

    return value as TicketStatus;
  }

  private mapPriority(value: string | null): TicketPriority | undefined {
    if (value === null) {
      return undefined;
    }

    if (!Object.values(TicketPriority).includes(value as TicketPriority)) {
      throw new Error(`Invalid ticket priority: ${value}`);
    }

    return value as TicketPriority;
  }

  private mapCategory(value: string | null): TicketCategory | undefined {
    if (value === null) {
      return undefined;
    }

    if (!Object.values(TicketCategory).includes(value as TicketCategory)) {
      throw new Error(`Invalid ticket category: ${value}`);
    }

    return value as TicketCategory;
  }

  private mapSentiment(value: string | null): TicketSentiment | undefined {
    if (value === null) {
      return undefined;
    }

    if (!Object.values(TicketSentiment).includes(value as TicketSentiment)) {
      throw new Error(`Invalid ticket sentiment: ${value}`);
    }

    return value as TicketSentiment;
  }
}
