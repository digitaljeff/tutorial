"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function JobWatcher({ jobId }: { jobId: string }) {
  const [status, setStatus] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`/api/jobs/${jobId}`);
        if (!r.ok) return;
        const s = await r.json();
        if (!alive) return;
        setStatus(s);
        if (s.done && s.episodeId) {
          router.push(`/episodes/${s.episodeId}`);
          return;
        }
      } catch {}
      if (alive) setTimeout(tick, 4000);
    };
    tick();
    return () => { alive = false; };
  }, [jobId, router]);

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <span className={`inline-block h-2 w-2 rounded-full ${status?.running ? "animate-pulse bg-amber-400" : "bg-zinc-600"}`} />
        {status?.running ? "Running…" : status?.done ? "Finished" : "Starting…"}
      </div>
      <pre className="mt-4 max-h-96 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-[11px] leading-relaxed text-zinc-400">
        {status?.logTail ?? "waiting for log…"}
      </pre>
    </div>
  );
}
