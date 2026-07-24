import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backlot Studio",
  description: "Your AI studio backlot — shows, bibles, episodes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#12121a] text-zinc-200 antialiased">
        <nav className="border-b border-zinc-800 bg-[#17171f]">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight text-amber-400">
              Backlot
            </Link>
            <div className="flex gap-4 text-sm text-zinc-400">
              <Link href="/" className="hover:text-zinc-100">Dashboard</Link>
              <Link href="/show" className="hover:text-zinc-100">Show Bible</Link>
              <Link href="/episodes" className="hover:text-zinc-100">Episodes</Link>
              <Link href="/produce" className="hover:text-zinc-100">Produce</Link>
            </div>
            <span className="ml-auto rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
              Studio MVP · single-show mode
            </span>
          </div>
        </nav>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
