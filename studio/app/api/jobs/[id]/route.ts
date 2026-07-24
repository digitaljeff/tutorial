import { getJobStatus } from "@/lib/jobs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const status = getJobStatus(id);
  if (!status) return new Response("not found", { status: 404 });
  return Response.json({
    running: status.running,
    done: status.done,
    episodeId: status.episodeId,
    logTail: status.logTail,
  });
}
