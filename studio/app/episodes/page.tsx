import Link from "next/link";
import { listEpisodes } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function Episodes() {
  const episodes = listEpisodes();
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-50">Episodes</h1>
      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-xs text-zinc-500">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Shots</th>
              <th className="p-3">QC flags</th>
              <th className="p-3">Retakes</th>
              <th className="p-3">Est. cost</th>
              <th className="p-3">Wall clock</th>
            </tr>
          </thead>
          <tbody>
            {episodes.map((e) => (
              <tr key={e.id} className="border-t border-zinc-800/60 bg-[#17171f] hover:bg-zinc-800/40">
                <td className="p-3">
                  <Link href={`/episodes/${e.id}`} className="font-medium text-zinc-100 hover:text-amber-400">
                    {e.title}
                  </Link>
                </td>
                <td className="p-3 text-zinc-400">{e.shots}</td>
                <td className="p-3">
                  {e.qcFlags > 0 ? (
                    <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-xs text-amber-400">{e.qcFlags}</span>
                  ) : (
                    <span className="text-zinc-600">0</span>
                  )}
                </td>
                <td className="p-3 text-zinc-400">{e.retakes}</td>
                <td className="p-3 text-zinc-400">{e.estUsd ? `$${e.estUsd.toFixed(2)}` : "—"}</td>
                <td className="p-3 text-zinc-400">{e.wallClockS ? `${Math.round(e.wallClockS / 60)}m` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
