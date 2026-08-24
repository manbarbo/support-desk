import { Header } from "@/components/layout/Header";
import { DLQMessageList } from "@/components/admin/DLQMessageList";

export default function DLQPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <DLQMessageList />
      </main>
    </>
  );
}
