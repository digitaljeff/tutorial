import { getSeason, listEpisodes } from "@/lib/data";
import { startProduce } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default function ProducePage() {
  const season = getSeason();
  const producedTitles = new Set(listEpisodes().map((e) => e.title.toLowerCase()));

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-zinc-50">Produce an episode</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Script → approval-free spike mode → shots → clips → voices → lip sync → cut. ~10 minutes, ~$4.
        </p>
      </header>

      <form action={startProduce} className="rounded-lg border border-zinc-800 bg-[#17171f] p-5">
        <label className="text-sm font-medium text-zinc-300">Your episode idea</label>
        <textarea name="idea" rows={3} required
          placeholder="e.g. Dana tries to win back a one-star reviewer who turns out to be Mo's cousin"
          className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-200 placeholder:text-zinc-600" />
        <button className="mt-3 rounded bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-300">
          Produce episode
        </button>
      </form>

      {season && (
        <section>
          <h2 className="mb-3 font-semibold text-zinc-100">Or pick from the Writers&apos; Room slate</h2>
          <div className="space-y-2">
            {season.episodes.map((e: any) => {
              const done = [...producedTitles].some((t) => t.includes(e.title.toLowerCase()));
              return (
                <form key={e.number} action={startProduce}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#17171f] p-3">
                  <input type="hidden" name="idea" value={`${e.title}: ${e.premise}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-200">
                      {e.number}. {e.title}
                      {done && <span className="ml-2 rounded bg-emerald-500/10 px-1.5 text-[10px] text-emerald-400">produced</span>}
                    </div>
                    <p className="truncate text-xs text-zinc-500">{e.premise}</p>
                  </div>
                  <button className="shrink-0 rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700">
                    {done ? "Produce again" : "Produce"}
                  </button>
                </form>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
