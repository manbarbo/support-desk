import { Header } from "@/components/layout/Header";
import { TicketList } from "@/components/tickets/TicketList";
import { TicketStream } from "@/components/tickets/TicketStream";

export default function TicketsPage() {
  return (
    <>
      <TicketStream />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <TicketList />
      </main>
    </>
  );
}
