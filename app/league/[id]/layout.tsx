import { LeagueNav } from "@/components/layout/league-nav";

export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-24">
      {children}
      <LeagueNav leagueId={id} />
    </div>
  );
}
