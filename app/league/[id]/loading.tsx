export default function LeagueLoading() {
  return (
    <div className="animate-pulse px-4 pt-6">
      <div className="mb-6 h-7 w-40 rounded-lg bg-zinc-800" />
      <div className="mb-4 h-4 w-24 rounded bg-zinc-800/80" />
      <div className="space-y-3">
        <div className="h-24 rounded-2xl bg-zinc-800/60" />
        <div className="h-24 rounded-2xl bg-zinc-800/60" />
        <div className="h-32 rounded-2xl bg-zinc-800/60" />
      </div>
    </div>
  );
}
