"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createLeague } from "@/lib/actions/league";
import {
  LeagueMembersBlock,
  type LeagueMemberListItem,
} from "@/components/league/league-members-block";
import { LeagueGamesSection } from "@/components/league/league-games-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DraftGame = {
  id: string;
  name: string;
  targetWins: string;
};

const actionBtnClass =
  "inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold transition-all active:scale-[0.98]";

type NewLeagueFormProps = {
  creatorDisplayName: string;
  creatorUserId: string;
  onCreated?: (leagueId: string, name: string, year: number | null) => void;
  onCancel?: () => void;
};

export function NewLeagueForm({
  creatorDisplayName,
  creatorUserId,
  onCreated,
  onCancel,
}: NewLeagueFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [leagueTargetWins, setLeagueTargetWins] = useState("");
  const [games, setGames] = useState<DraftGame[]>([]);
  const [draftMembers, setDraftMembers] = useState<LeagueMemberListItem[]>([]);
  const [pending, startTransition] = useTransition();

  const members: LeagueMemberListItem[] = [
    {
      display_name: creatorDisplayName,
      role: "owner",
      user_id: creatorUserId,
    },
    ...draftMembers,
  ];

  const removeGame = (id: string) => {
    setGames((prev) => prev.filter((g) => g.id !== id));
  };

  const updateGameTarget = (id: string, value: string) => {
    setGames((prev) =>
      prev.map((g) => (g.id === id ? { ...g, targetWins: value } : g))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Укажите название лиги");
      return;
    }

    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("ends_at", endsAt);
    formData.set("target_wins", leagueTargetWins);
    formData.set(
      "games",
      JSON.stringify(
        games.map((g) => ({
          name: g.name,
          target_wins: g.targetWins.trim()
            ? parseInt(g.targetWins, 10)
            : null,
        }))
      )
    );
    formData.set(
      "member_user_ids",
      JSON.stringify(
        draftMembers.map((m) => m.user_id).filter((id): id is string => !!id)
      )
    );

    startTransition(async () => {
      const result = await createLeague(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Лига создана");
      const year = endsAt
        ? parseInt(endsAt.slice(0, 4), 10) || new Date().getFullYear()
        : new Date().getFullYear();
      if (onCreated) {
        onCreated(result.leagueId, name.trim(), year);
      } else {
        router.push(`/?highlight=${result.leagueId}`);
        router.refresh();
      }
    });
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-sm text-zinc-400">Название</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Лига 2026"
              disabled={pending}
              required
            />
          </label>
          <label className="w-full shrink-0 sm:w-[11.5rem]">
            <span className="mb-1 block text-sm text-zinc-400">
              Дата завершения
            </span>
            <Input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="h-11"
              disabled={pending}
            />
          </label>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          <label className="block text-xs text-zinc-500">
            Побед лидеру (всего)
            <Input
              type="number"
              min={1}
              placeholder="Не задано"
              value={leagueTargetWins}
              onChange={(e) => setLeagueTargetWins(e.target.value)}
              className="mt-1"
              disabled={pending}
            />
          </label>
          <p className="mt-2 text-xs text-zinc-600">
            По дате завершения или лимиту побед подводятся итоги.
          </p>
        </div>

        <LeagueGamesSection
          games={games.map((g) => ({
            id: g.id,
            name: g.name,
            targetWins: g.targetWins,
          }))}
          disabled={pending}
          pending={pending}
          editable
          allowAdd
          onAdd={({ name, targetWins }) => {
            setGames((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                name,
                targetWins:
                  targetWins != null ? String(targetWins) : "",
              },
            ]);
          }}
          onRemove={removeGame}
          onTargetWinsChange={updateGameTarget}
        />

        <LeagueMembersBlock
          members={members}
          leagueName={name.trim() || undefined}
          allowAdd
          addDisabled={pending}
          pending={pending}
          onMemberAdded={(member) => {
            if (
              draftMembers.some((m) => m.user_id === member.user_id) ||
              member.user_id === creatorUserId
            ) {
              return;
            }
            setDraftMembers((prev) => [...prev, member]);
          }}
        />

        <div className="mt-8 grid grid-cols-2 gap-2">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className={cn(
                actionBtnClass,
                "border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
              )}
            >
              Отмена
            </button>
          ) : (
            <Link
              href="/"
              className={cn(
                actionBtnClass,
                "border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800"
              )}
            >
              Отмена
            </Link>
          )}
          <Button
            type="submit"
            className="h-11 w-full min-w-0"
            disabled={pending}
          >
            {pending ? "Создание…" : "Создать"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
