import Link from "next/link";
import { getShow, getBibleState, getSeason, listEpisodes } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [show, bible, season, episodes] = [await getShow(), getBibleState(), getSeason(), listEpisodes()];
  const spend = episodes.reduce((s, e) => s + (e.estUsd ?? 0), 0);
  const voicesReady = bible ? Object.values(bible.characters).filter((c: any) => c.voice_id).length : 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-zinc-50">{show.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">{show.logline}</p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Episodes produced", value: episodes.length },
          { label: "Cast voices ready", value: `${voicesReady}/${show.characters.length}` },
          { label: "Season slate", value: season ? `${season.episodes.length} eps` : "—" },
          { label: "Est. total spend", value: `$${spend.toFixed(2)}` },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-zinc-800 bg-[#17171f] p-4">
            <div className="text-2xl font-bold text-amber-400">{s.value}</div>
            <div className="mt-1 text-xs text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-100">Latest episodes</h2>
          <Link href="/episodes" className="text-sm text-amber-400 hover:underline">all episodes →</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {episodes.slice(0, 3).map((e) => (
            <Link key={e.id} href={`/episodes/${e.id}`}
              className="rounded-lg border border-zinc-800 bg-[#17171f] p-4 hover:border-amber-400/40">
              <div className="font-medium text-zinc-100">{e.title}</div>
              <div className="mt-2 text-xs text-zinc-500">
                {e.shots} shots · {e.qcFlags} QC flags · {e.estUsd ? `$${e.estUsd.toFixed(2)}` : "—"}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-[#17171f] p-5">
        <h2 className="font-semibold text-zinc-100">Season arc</h2>
        {season ? (
          <>
            <p className="mt-2 text-sm text-zinc-400">{season.arc.destination}</p>
            <ol className="mt-3 grid gap-2 text-xs text-zinc-500 md:grid-cols-3">
              {season.arc.acts.map((a: string, i: number) => (
                <li key={i} className="rounded bg-zinc-800/50 p-2"><b className="text-zinc-300">Act {i + 1}.</b> {a}</li>
              ))}
            </ol>
          </>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">No season yet — run the Writers&apos; Room.</p>
        )}
      </section>
    </div>
  );
}
