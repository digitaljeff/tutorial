"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import path from "node:path";
import { startJob } from "./jobs";
import { OUT_ROOT } from "./data";

export async function startProduce(formData: FormData) {
  const idea = String(formData.get("idea") ?? "").slice(0, 500);
  if (!idea.trim()) return;
  const job = startJob("produce", ["produce", "--idea", idea], { idea });
  redirect(`/produce/${job.id}`);
}

export async function startRetake(formData: FormData) {
  const episodeId = String(formData.get("episode") ?? "");
  const shot = String(formData.get("shot") ?? "");
  const note = String(formData.get("note") ?? "").slice(0, 300);
  if (!/^ep-\d+$/.test(episodeId) || !/^\d+$/.test(shot)) return;
  const args = ["retake", "--ep", path.join(OUT_ROOT, episodeId), "--shot", shot];
  if (note.trim()) args.push("--note", note);
  startJob("retake", args, { episodeId, shot, note });
  revalidatePath(`/episodes/${episodeId}`);
  redirect(`/episodes/${episodeId}?retaking=${shot}`);
}
