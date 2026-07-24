import { getShow, getBibleState, getSeason, mediaUrl } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ShowBible() {
  const show = await getShow();
  const bible = getBibleState();
  const season = getSeason();

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-zinc-50">Show Bible</h1>
        <p className="mt-1 text-sm text-zinc-500">
          The persistent knowledge base every generation draws from. Edit-in-app comes with the Postgres bible.
        </p>
      </header>

      <section>
        <h2 className="mb-3 font-semibold text-zinc-100">Cast</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {show.characters.map((c: any) => {
            const state = bible?.characters?.[c.id];
            return (
              <div key={c.id} className="rounded-lg border border-zinc-800 bg-[#17171f] p-4">
                <div className="flex gap-4">
                  {state?.sheets?.front && (
                    <img src={mediaUrl(state.sheets.front)} alt={c.name}
                      className="h-40 w-28 rounded object-cover" />
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-zinc-50">{c.name}
                      <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">{c.role}</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">{c.personality.traits.join(" · ")}</p>
                    <p className="mt-2 text-xs text-zinc-500">Wants: {c.personality.wants}</p>
                    <p className="mt-1 text-xs text-zinc-500">Function: {c.personality.comedic_function}</p>
                    <p className="mt-2 text-[11px] text-zinc-600">
                      Voice: {state?.voice_id ? <code className="text-emerald-500">{state.voice_id.slice(0, 12)}…</code> : "not minted"}
                    </p>
                  </div>
                </div>
                <details className="mt-3 text-xs text-zinc-500">
                  <summary className="cursor-pointer text-zinc-400">Canonical descriptor (goes into every prompt)</summary>
                  <p className="mt-1 rounded bg-zinc-900 p-2 font-mono text-[11px]">{c.appearance.canonical_descriptor}</p>
                </details>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-zinc-100">Sets</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {show.locations.map((l: any) => (
            <div key={l.id} className="rounded-lg border border-zinc-800 bg-[#17171f] p-4">
              <div className="font-medium text-zinc-100">{l.name}</div>
              <p className="mt-1 text-xs text-zinc-500">{l.canonical_descriptor}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-[#17171f] p-4">
          <h2 className="font-semibold text-zinc-100">Style guide</h2>
          <p className="mt-2 text-xs text-zinc-400"><b>Visual:</b> {show.style_guide.visual}</p>
          <p className="mt-2 text-xs text-zinc-400"><b>Writing:</b> {show.style_guide.writing}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-[#17171f] p-4">
          <h2 className="font-semibold text-zinc-100">Sound kit</h2>
          <p className="mt-2 text-xs text-zinc-400"><b>Score:</b> {show.sound_kit.score_mood}</p>
          {bible?.jingle && (
            <div className="mt-3">
              <div className="mb-1 text-xs text-zinc-500">Intro theme (generated once, reused every episode):</div>
              <audio controls src={mediaUrl(bible.jingle)} className="h-8 w-full" />
            </div>
          )}
        </div>
      </section>

      {season && (
        <section>
          <h2 className="mb-3 font-semibold text-zinc-100">Season slate</h2>
          <div className="overflow-hidden rounded-lg border border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900 text-zinc-500">
                <tr><th className="p-2">#</th><th className="p-2">Title</th><th className="p-2">Premise</th><th className="p-2">Arc beat</th></tr>
              </thead>
              <tbody>
                {season.episodes.map((e: any) => (
                  <tr key={e.number} className="border-t border-zinc-800/60 bg-[#17171f] text-zinc-400">
                    <td className="p-2 text-zinc-500">{e.number}</td>
                    <td className="p-2 font-medium text-zinc-200">{e.title}</td>
                    <td className="p-2">{e.premise}</td>
                    <td className="p-2 text-zinc-500">{e.arc_beat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
