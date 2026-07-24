import Link from "next/link";
import { listShows, listEpisodes, getBibleState } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function Home() {
  const shows = listShows();
  const allEps = listEpisodes();
  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Your shows</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {shows.length} show{shows.length === 1 ? "" : "s"} · {allEps.length} episodes produced
          </p>
        </div>
        <Link href="/create"
          className="rounded bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-300">
          + Create a show
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {shows.map((s: any) => {
          const eps = allEps.filter((e) => e.showId === s.id);
          const bible = getBibleState(s.id);
          const voices = bible ? Object.values(bible.characters).filter((c: any) => c.voice_id).length : 0;
          return (
            <Link key={s.id} href={`/shows/${s.id}`}
              className="rounded-lg border border-zinc-800 bg-[#17171f] p-5 hover:border-amber-400/40">
              <div className="text-lg font-bold text-zinc-50">{s.title}</div>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{s.logline}</p>
              <div className="mt-3 flex gap-4 text-xs text-zinc-500">
                <span>{eps.length} episodes</span>
                <span>{s.characters.length} cast · {voices} voices ready</span>
                <span>{s.format?.preset ?? "sitcom"}</span>
              </div>
            </Link>
          );
        })}
        {shows.length === 0 && (
          <p className="text-sm text-zinc-500">No shows yet — create your first one.</p>
        )}
      </div>
    </div>
  );
}
