import { CreateTicketHandler } from './create-ticket.handler';
import { CreateTicketCommand } from './create-ticket.command';
import { TicketStatus } from '@domain/enums/ticket-status.enum';
import {
  createMockTicketRepository,
  createMockMessagePublisher,
  createMockLogger,
} from '../../../../__mocks__/mocks';

describe('CreateTicketHandler (Integration)', () => {
  let handler: CreateTicketHandler;
  let ticketRepository: ReturnType<typeof createMockTicketRepository>;
  let messagePublisher: ReturnType<typeof createMockMessagePublisher>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeAll(() => {
    ticketRepository = createMockTicketRepository();
    messagePublisher = createMockMessagePublisher();
    logger = createMockLogger();
    handler = new CreateTicketHandler(
      ticketRepository,
      messagePublisher,
      logger,
    );
  });

  beforeEach(() => {
    ticketRepository.create.mockReset();
    messagePublisher.publish.mockReset();
    logger.info.mockReset();
    ticketRepository.create.mockImplementation((ticket) =>
      Promise.resolve(ticket),
    );
  });

  it('should create a ticket through the handler', async () => {
    const result = await handler.execute(
      new CreateTicketCommand(
        'customer-123',
        'Order issue',
        'My order is late',
      ),
    );

    expect(result).toMatchObject({
      customerId: 'customer-123',
      title: 'Order issue',
      status: TicketStatus.PROCESSING,
    });
  });

  it('should persist and publish through the pipeline', async () => {
    await handler.execute(
      new CreateTicketCommand('customer-456', 'Refund', 'Need refund'),
    );

    expect(ticketRepository.create).toHaveBeenCalled();
    expect(messagePublisher.publish).toHaveBeenCalled();
  });

  it('should generate unique ids for each command', async () => {
    const result1 = await handler.execute(
      new CreateTicketCommand('c1', 'Title 1', 'Desc 1'),
    );
    const result2 = await handler.execute(
      new CreateTicketCommand('c2', 'Title 2', 'Desc 2'),
    );

    expect(result1.id).not.toBe(result2.id);
  });

  it('should set status to PROCESSING', async () => {
    const result = await handler.execute(
      new CreateTicketCommand('c1', 'Title', 'Desc'),
    );

    expect(result.status).toBe(TicketStatus.PROCESSING);
  });

  it('should include timestamps', async () => {
    const result = await handler.execute(
      new CreateTicketCommand('c1', 'Title', 'Desc'),
    );

    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });

  it('should propagate repository errors', async () => {
    ticketRepository.create.mockRejectedValue(new Error('DB error'));

    await expect(
      handler.execute(new CreateTicketCommand('c1', 'Title', 'Desc')),
    ).rejects.toThrow('DB error');
  });

  it('should log ticket creation', async () => {
    await handler.execute(
      new CreateTicketCommand(
        'customer-123',
        'Order issue',
        'My order is late',
      ),
    );

    expect(logger.info).toHaveBeenCalledWith(
      'Creating ticket',
      expect.objectContaining({
        context: 'CreateTicketHandler',
        customerId: 'customer-123',
      }),
    );
  });
});
