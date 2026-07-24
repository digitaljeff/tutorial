import { notFound, redirect } from "next/navigation";
import { getEpisode } from "@/lib/data";

// Compat route: job watchers know only the episode id; hop to the show-scoped page.
export default async function EpisodeRedirect(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const ep = getEpisode(id);
  if (!ep) notFound();
  redirect(`/shows/${ep.manifest.show_id}/episodes/${id}`);
}
