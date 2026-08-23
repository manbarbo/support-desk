import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/tickets" className="text-xl font-bold">
          AI Support Desk
        </Link>

        <Link
          href="/tickets/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          + New Ticket
        </Link>
      </div>
    </header>
  );
}