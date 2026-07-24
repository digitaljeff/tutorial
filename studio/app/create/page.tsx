import { startCreateShow } from "@/lib/actions";

export default function CreateShow() {
  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-50">Create a show</h1>
        <p className="mt-1 text-sm text-zinc-500">
          One sentence in — full show bible out: cast with character sheets and voices, sets,
          style guide, theme song, and a season arc. Fast Start drafts everything; you stay the director.
        </p>
      </header>
      <form action={startCreateShow} className="rounded-lg border border-zinc-800 bg-[#17171f] p-5">
        <label className="text-sm font-medium text-zinc-300">Logline *</label>
        <textarea name="logline" rows={3} required
          placeholder="e.g. a mockumentary about the overnight crew of a barely-haunted budget motel"
          className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-200 placeholder:text-zinc-600" />
        <label className="mt-4 block text-sm font-medium text-zinc-300">Title (optional — Fast Start invents one otherwise)</label>
        <input name="title" placeholder="Checked In"
          className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600" />
        <button className="mt-4 rounded bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-300">
          Fast Start this show (~$0.60, ~4 min)
        </button>
      </form>
    </div>
  );
}
