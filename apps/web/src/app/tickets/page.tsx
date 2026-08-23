import { Header } from "@/components/layout/Header";
import { TicketList } from "@/components/tickets/TicketList";

export default function TicketsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <TicketList />
      </main>
    </>
  );
}
