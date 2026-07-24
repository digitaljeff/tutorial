"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import path from "node:path";
import { startJob } from "./jobs";
import { OUT_ROOT } from "./data";

const SHOW_ID = /^[a-z0-9-]{2,40}$/;

export async function startProduce(formData: FormData) {
  const idea = String(formData.get("idea") ?? "").slice(0, 500);
  const show = String(formData.get("show") ?? "");
  if (!idea.trim() || !SHOW_ID.test(show)) return;
  const job = startJob("produce", ["produce", "--show", show, "--idea", idea], { idea, show });
  redirect(`/produce/${job.id}`);
}

export async function startRetake(formData: FormData) {
  const episodeId = String(formData.get("episode") ?? "");
  const showId = String(formData.get("show") ?? "");
  const shot = String(formData.get("shot") ?? "");
  const note = String(formData.get("note") ?? "").slice(0, 300);
  if (!/^ep-\d+$/.test(episodeId) || !/^\d+$/.test(shot) || !SHOW_ID.test(showId)) return;
  const args = ["retake", "--ep", path.join(OUT_ROOT, episodeId), "--shot", shot];
  if (note.trim()) args.push("--note", note);
  startJob("retake", args, { episodeId, shot, note });
  revalidatePath(`/shows/${showId}/episodes/${episodeId}`);
  redirect(`/shows/${showId}/episodes/${episodeId}?retaking=${shot}`);
}

export async function startCreateShow(formData: FormData) {
  const logline = String(formData.get("logline") ?? "").slice(0, 400);
  const title = String(formData.get("title") ?? "").slice(0, 80);
  if (!logline.trim()) return;
  const args = ["create-show", "--logline", logline];
  if (title.trim()) args.push("--title", title);
  const job = startJob("create", args, { logline, title });
  redirect(`/create/${job.id}`);
}
