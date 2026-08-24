import { Header } from "@/components/layout/Header";
import { DLQMessageList } from "@/components/admin/DLQMessageList";
import { DlqStream } from "@/components/admin/DlqStream";

export const dynamic = "force-dynamic";

export default async function DLQPage() {
  return (
    <>
      <DlqStream />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <DLQMessageList />
      </main>
    </>
  );
}
