import { getLeagueContext } from "@/lib/league-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyInviteButton } from "@/components/league/copy-invite-button";
import { Users } from "lucide-react";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { league, members, currentMember } = await getLeagueContext(id);

  return (
    <main className="px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Игроки</h1>
        <p className="text-sm text-zinc-400">{members.length} человек</p>
      </header>

      {currentMember.role === "owner" && (
        <div className="mb-6">
          <CopyInviteButton token={league.invite_token} />
        </div>
      )}

      <ul className="space-y-2">
        {members.map((member) => (
          <li key={member.id}>
            <Card className="flex items-center justify-between py-3">
              <span className="flex items-center gap-2 font-medium">
                <Users className="h-4 w-4 text-zinc-500" />
                {member.display_name}
              </span>
              {member.role === "owner" && (
                <Badge variant="default">Создатель</Badge>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
