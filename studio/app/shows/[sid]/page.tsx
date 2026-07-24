import Link from "next/link";
import { notFound } from "next/navigation";
import { getShow, getBibleState, getSeason, listEpisodes } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ShowDashboard(props: { params: Promise<{ sid: string }> }) {
  const { sid } = await props.params;
  const show = getShow(sid);
  if (!show) notFound();
  const bible = getBibleState(sid);
  const season = getSeason(sid);
  const episodes = listEpisodes(sid);
  const spend = episodes.reduce((s, e) => s + (e.estUsd ?? 0), 0);
  const voicesReady = bible ? Object.values(bible.characters).filter((c: any) => c.voice_id).length : 0;

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs text-zinc-600"><Link href="/" className="hover:text-zinc-400">shows</Link> / {sid}</div>
        <h1 className="mt-1 text-2xl font-bold text-zinc-50">{show.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">{show.logline}</p>
        <div className="mt-3 flex gap-3 text-sm">
          <Link href={`/shows/${sid}/bible`} className="rounded bg-zinc-800 px-3 py-1.5 text-zinc-300 hover:bg-zinc-700">Show Bible</Link>
          <Link href={`/shows/${sid}/episodes`} className="rounded bg-zinc-800 px-3 py-1.5 text-zinc-300 hover:bg-zinc-700">Episodes</Link>
          <Link href={`/shows/${sid}/produce`} className="rounded bg-amber-400 px-3 py-1.5 font-semibold text-zinc-900 hover:bg-amber-300">Produce</Link>
        </div>
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
        <h2 className="mb-3 font-semibold text-zinc-100">Latest episodes</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {episodes.slice(0, 6).map((e) => (
            <Link key={e.id} href={`/shows/${sid}/episodes/${e.id}`}
              className="rounded-lg border border-zinc-800 bg-[#17171f] p-4 hover:border-amber-400/40">
              <div className="font-medium text-zinc-100">{e.title}</div>
              <div className="mt-2 text-xs text-zinc-500">
                {e.shots} shots · {e.qcFlags} QC flags · {e.estUsd ? `$${e.estUsd.toFixed(2)}` : "—"}
              </div>
            </Link>
          ))}
          {episodes.length === 0 && <p className="text-sm text-zinc-500">No episodes yet.</p>}
        </div>
      </section>

      {season && (
        <section className="rounded-lg border border-zinc-800 bg-[#17171f] p-5">
          <h2 className="font-semibold text-zinc-100">Season arc</h2>
          <p className="mt-2 text-sm text-zinc-400">{season.arc.destination}</p>
          <ol className="mt-3 grid gap-2 text-xs text-zinc-500 md:grid-cols-3">
            {season.arc.acts.map((a: string, i: number) => (
              <li key={i} className="rounded bg-zinc-800/50 p-2"><b className="text-zinc-300">Act {i + 1}.</b> {a}</li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
