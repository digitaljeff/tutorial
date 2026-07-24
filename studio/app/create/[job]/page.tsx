import { JobWatcher } from "@/app/produce/[job]/watcher";

export default async function CreateJobPage(props: { params: Promise<{ job: string }> }) {
  const { job } = await props.params;
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-zinc-50">Fast Start in progress</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Drafting the bible → character sheets → voice design → theme song → season arc. You&apos;ll land on the new show when it&apos;s ready.
      </p>
      <JobWatcher jobId={job} />
    </div>
  );
}
