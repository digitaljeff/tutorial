import { JobWatcher } from "./watcher";

export default async function JobPage(props: { params: Promise<{ job: string }> }) {
  const { job } = await props.params;
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-zinc-50">Production in progress</h1>
      <p className="mt-1 text-sm text-zinc-500">
        The pipeline is running: script → quote → keyframes (QC-gated) → clips → lip sync → music → assembly.
      </p>
      <JobWatcher jobId={job} />
    </div>
  );
}
