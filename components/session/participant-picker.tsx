"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { updateSessionParticipants } from "@/lib/actions/score";
import type { LeagueMember } from "@/lib/types";

interface ParticipantPickerProps {
  leagueId: string;
  sessionId: string;
  allMembers: LeagueMember[];
  selectedIds: string[];
}

export function ParticipantPicker({
  leagueId,
  sessionId,
  allMembers,
  selectedIds,
}: ParticipantPickerProps) {
  const [pending, startTransition] = useTransition();

  const toggle = (memberId: string) => {
    const next = selectedIds.includes(memberId)
      ? selectedIds.filter((id) => id !== memberId)
      : [...selectedIds, memberId];

    startTransition(async () => {
      await updateSessionParticipants(sessionId, leagueId, next);
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {allMembers.map((member) => {
        const selected = selectedIds.includes(member.id);
        return (
          <button
            key={member.id}
            type="button"
            disabled={pending}
            onClick={() => toggle(member.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-all",
              selected
                ? "border-violet-500 bg-violet-600/20 text-violet-200"
                : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
            )}
          >
            {member.display_name}
          </button>
        );
      })}
    </div>
  );
}
