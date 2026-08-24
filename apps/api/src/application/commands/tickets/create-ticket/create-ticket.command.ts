export class CreateTicketCommand {
  constructor(
    public readonly customerId: string,
    public readonly title: string,
    public readonly description: string,
  ) {}
}
