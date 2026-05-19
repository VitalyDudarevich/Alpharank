"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLeague } from "@/lib/league-context";
import { Button } from "@/components/ui/button";
import { LeagueMembersBlock } from "@/components/league/league-members-block";
import type { LeagueMemberListItem } from "@/components/league/league-members-block";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { appMainClass } from "@/lib/layout-page";

export function MembersPageClient() {
  const router = useRouter();
  const { leagueId, league, members, currentMember } = useLeague();
  const isOwner = currentMember.role === "owner";

  const [addOpen, setAddOpen] = useState(false);

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
    <main className={appMainClass}>
      <AppPageHeader title="Участники" />

      <LeagueMembersBlock
        members={list}
        inviteToken={league.invite_token}
        leagueName={league.name}
        leagueId={leagueId}
        allowAdd={isOwner}
        hideAddButton
        pickerOpen={addOpen}
        onPickerOpenChange={setAddOpen}
        onMemberAdded={(member) => {
          setList((prev) => [...prev, member]);
          router.refresh();
        }}
      />

      {isOwner && !addOpen && (
        <div className="mt-6">
          <Button
            type="button"
            className="h-12 w-full text-base font-semibold"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-5 w-5" />
            Добавить участника
          </Button>
        </div>
      )}
    </main>
  );
}
