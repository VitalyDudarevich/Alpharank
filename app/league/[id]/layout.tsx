import { LeagueNav } from "@/components/layout/league-nav";
import { LeagueProvider } from "@/lib/league-context";
import { getLeagueContext } from "@/lib/league-data";

export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, league, members, games, currentMember } =
    await getLeagueContext(id);

  return (
    <LeagueProvider
      value={{
        leagueId: id,
        league,
        members,
        games,
        currentMember,
        userId: user.id,
      }}
    >
      <div className="mx-auto min-h-screen w-full max-w-lg pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:max-w-2xl md:pb-28">
        {children}
      </div>
      <LeagueNav leagueId={id} />
    </LeagueProvider>
  );
}
