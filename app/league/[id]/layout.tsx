import { LeagueProvider } from "@/lib/league-context";
import { getLeagueContext } from "@/lib/league-data";
import { appPageContentClass, leaguePageClass } from "@/lib/layout-page";

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
      <div className={leaguePageClass}>
        <div className={appPageContentClass}>{children}</div>
      </div>
    </LeagueProvider>
  );
}
