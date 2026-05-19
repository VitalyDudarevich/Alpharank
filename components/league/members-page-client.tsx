"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLeague } from "@/lib/league-context";
import { LeagueMembersBlock } from "@/components/league/league-members-block";
import type { LeagueMemberListItem } from "@/components/league/league-members-block";

export function MembersPageClient() {
  const router = useRouter();
  const { leagueId, league, members, currentMember } = useLeague();
  const isOwner = currentMember.role === "owner";

  const [list, setList] = useState<LeagueMemberListItem[]>(() =>
    members.map((m) => ({
      id: m.id,
      user_id: m.user_id,
      display_name: m.display_name,
      role: m.role,
    }))
  );

  useEffect(() => {
    setList(
      members.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        display_name: m.display_name,
        role: m.role,
      }))
    );
  }, [members]);

  return (
    <main className="px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Люди</h1>
        <p className="text-sm text-zinc-400">{list.length} человек</p>
      </header>

      <LeagueMembersBlock
        members={list}
        inviteToken={league.invite_token}
        leagueName={league.name}
        leagueId={leagueId}
        allowAdd={isOwner}
        onMemberAdded={(member) => {
          setList((prev) => [...prev, member]);
          router.refresh();
        }}
      />
    </main>
  );
}
