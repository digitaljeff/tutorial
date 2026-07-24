import { notFound } from "next/navigation";
import path from "node:path";
import { getEpisode, mediaUrl, OUT_ROOT } from "@/lib/data";
import { startRetake } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function EpisodePage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ retaking?: string }>;
}) {
  const { id } = await props.params;
  const { retaking } = await props.searchParams;
  const ep = getEpisode(id);
  if (!ep) notFound();
  const m = ep.manifest;
  const videoUrl = `${mediaUrl(path.join(OUT_ROOT, id, "episode.mp4"))}?v=${ep.videoMtime}`;

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">{m.script.title}</h1>
          <p className="mt-1 text-xs text-zinc-500">
            {m.shots.length} shots · est ${m.quote?.total_usd?.toFixed(2) ?? "—"} ·
            {m.wall_clock_s ? ` produced in ${Math.round(m.wall_clock_s / 60)}m · ` : " "}
            idea: “{m.idea}”
          </p>
        </div>
        <a href={videoUrl} download={`${id}.mp4`}
          className="rounded bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700">
          Download MP4
        </a>
      </header>

      <video controls src={videoUrl} className="w-full max-w-3xl rounded-lg border border-zinc-800" />

      {retaking && (
        <p className="rounded border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-300">
          Retake running on shot {retaking} — refresh in a few minutes; the cut reassembles automatically.
        </p>
      )}

      {m.retakes.length > 0 && (
        <p className="text-xs text-zinc-500">
          Retake history: {m.retakes.map((r: any) => `#${r.shot}${r.note ? ` (“${r.note}”)` : ""}`).join(", ")}
        </p>
      )}

      <section>
        <h2 className="mb-3 font-semibold text-zinc-100">Shot board</h2>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {m.shots.map((s: any) => (
            <div key={s.idx}
              className={`w-56 shrink-0 rounded-lg border bg-[#17171f] p-3 ${s.qc && s.qc.pass === false ? "border-amber-400/60" : "border-zinc-800"}`}>
              <img src={mediaUrl(s.keyframeFile)} alt={`shot ${s.idx}`} className="w-full rounded" />
              <div className="mt-2 text-[11px] text-zinc-500">
                #{s.idx} · {s.location_id} · {s.duration_s}s
                {s.qc && s.qc.pass === false && (
                  <span className="ml-1 rounded bg-amber-400/10 px-1 text-amber-400">QC</span>
                )}
              </div>
              {(s.line_times ?? []).map((lt: any, i: number) => (
                <p key={i} className="mt-1 text-[11px] text-zinc-400">
                  <b className="text-amber-400/90">{lt.line.character_id}</b> {lt.line.text}
                </p>
              ))}
              <form action={startRetake} className="mt-2 flex gap-1.5">
                <input type="hidden" name="episode" value={id} />
                <input type="hidden" name="shot" value={s.idx} />
                <input name="note" placeholder="director note"
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-[11px] text-zinc-300 placeholder:text-zinc-600" />
                <button className="rounded bg-amber-400 px-2 py-1 text-[11px] font-semibold text-zinc-900 hover:bg-amber-300">
                  Retake
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <details className="rounded-lg border border-zinc-800 bg-[#17171f] p-4">
        <summary className="cursor-pointer font-semibold text-zinc-100">Script</summary>
        <div className="mt-3 space-y-4">
          {m.script.scenes.map((sc: any, i: number) => (
            <div key={i}>
              <div className="text-xs font-bold uppercase text-zinc-500">{sc.slugline}</div>
              <p className="mt-1 text-xs italic text-zinc-600">{sc.action}</p>
              {sc.lines.map((l: any, j: number) => (
                <p key={j} className="mt-1.5 text-sm text-zinc-300">
                  <b className="text-amber-400/90">{l.character_id.toUpperCase()}</b>
                  <span className="ml-1 text-zinc-600">{l.delivery_tags}</span> {l.text}
                </p>
              ))}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
