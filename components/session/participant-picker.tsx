"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Minus, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { addKnownMemberToLeague, fetchUserPeopleCatalog } from "@/lib/actions/members";
import { addWin, undoWin, updateSessionParticipants } from "@/lib/actions/score";
import type { CatalogPersonItem } from "@/lib/user-people-catalog";
import { isAllGames } from "@/lib/arena-games";
import type { LeagueMember } from "@/lib/types";

interface ParticipantPickerProps {
  leagueId: string;
  sessionId: string;
  allMembers: LeagueMember[];
  selectedIds: string[];
  onSelectionChange?: (ids: string[]) => void;
  gameId: string;
  gameName: string;
  winCounts: Record<string, number>;
  eloEnabled: boolean;
  eloK: number;
  winsDisabled?: boolean;
  embedded?: boolean;
  memberColors?: Record<string, string>;
  onWinRecorded?: (winnerMemberId: string, gameId: string) => void;
  onLeagueMemberAdded?: (member: LeagueMember) => void;
}

export function ParticipantPicker({
  leagueId,
  sessionId,
  allMembers,
  selectedIds: initialIds,
  onSelectionChange,
  gameId,
  gameName,
  winCounts: initialWinCounts,
  eloEnabled,
  eloK,
  winsDisabled,
  embedded = false,
  memberColors = {},
  onWinRecorded,
  onLeagueMemberAdded,
}: ParticipantPickerProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [peopleCatalog, setPeopleCatalog] = useState<CatalogPersonItem[]>([]);
  const [selectedIds, setSelectedIds] = useState(initialIds);
  const [localCounts, setLocalCounts] = useState(initialWinCounts);
  const [pending, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIds(initialIds);
  }, [initialIds]);

  useEffect(() => {
    setLocalCounts(initialWinCounts);
  }, [initialWinCounts, gameId]);

  useEffect(() => {
    if (!addOpen) return;
    void fetchUserPeopleCatalog(leagueId).then((res) => {
      if (!res.error) setPeopleCatalog(res.catalog);
    });
  }, [addOpen, leagueId]);

  useEffect(() => {
    if (!addOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const target = e.target as Node;
        const addBtn = panelRef.current.querySelector("[data-add-trigger]");
        if (addBtn?.contains(target)) return;
        setAddOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [addOpen]);

  const persist = useCallback(
    (ids: string[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void updateSessionParticipants(sessionId, leagueId, ids);
      }, 400);
    },
    [sessionId, leagueId]
  );

  const apply = (next: string[]) => {
    setSelectedIds(next);
    onSelectionChange?.(next);
    persist(next);
  };

  const add = (memberId: string) => {
    if (selectedIds.includes(memberId)) return;
    apply([...selectedIds, memberId]);
    setQuery("");
  };

  const remove = (memberId: string) => {
    apply(selectedIds.filter((id) => id !== memberId));
  };

  const selectedParticipants = useMemo(
    () =>
      selectedIds
        .map((id) => allMembers.find((m) => m.id === id))
        .filter((m): m is LeagueMember => !!m),
    [allMembers, selectedIds]
  );

  const q = query.trim().toLowerCase();

  const leagueUserIds = useMemo(
    () => new Set(allMembers.map((m) => m.user_id)),
    [allMembers]
  );

  const availableMembers = useMemo(() => {
    return allMembers
      .filter((m) => !selectedIds.includes(m.id))
      .filter((m) => !q || m.display_name.toLowerCase().includes(q));
  }, [allMembers, selectedIds, q]);

  const availablePeople = useMemo(() => {
    return peopleCatalog
      .filter((p) => !leagueUserIds.has(p.user_id))
      .filter((p) => !q || p.display_name.toLowerCase().includes(q));
  }, [peopleCatalog, leagueUserIds, q]);

  const addFromNetwork = (person: CatalogPersonItem) => {
    startTransition(async () => {
      const result = await addKnownMemberToLeague(leagueId, person.user_id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (!result.member) return;

      const newMember: LeagueMember = {
        id: result.member.id,
        league_id: leagueId,
        user_id: result.member.user_id,
        display_name: result.member.display_name,
        role: result.member.role,
        created_at: new Date().toISOString(),
      };

      onLeagueMemberAdded?.(newMember);
      add(newMember.id);
      setPeopleCatalog((prev) =>
        prev.filter((p) => p.user_id !== person.user_id)
      );
    });
  };

  const handleWin = (memberId: string, displayName: string) => {
    if (winsDisabled || !gameId || isAllGames(gameId)) {
      toast.error(
        isAllGames(gameId)
          ? "Выберите конкретную игру для записи победы"
          : "Сначала выберите игру"
      );
      return;
    }
    if (selectedIds.length < 2) {
      toast.error("Нужно минимум 2 участника");
      return;
    }

    setLocalCounts((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] ?? 0) + 1,
    }));

    startTransition(async () => {
      const result = await addWin({
        leagueId,
        sessionId,
        gameId,
        winnerMemberId: memberId,
        participantIds: selectedIds,
        winnerDisplayName: displayName,
        gameName,
        eloEnabled,
        eloK,
      });

      if (result.error) {
        setLocalCounts((prev) => ({
          ...prev,
          [memberId]: Math.max(0, (prev[memberId] ?? 1) - 1),
        }));
        toast.error(result.error);
        return;
      }

      onWinRecorded?.(memberId, gameId);

      if (result.eventId) {
        const eventId = result.eventId;
        toast.success(`+1 ${displayName}`, {
          action: {
            label: "Отменить",
            onClick: () => {
              startTransition(async () => {
                const undo = await undoWin(leagueId, eventId);
                if (undo.error) toast.error(undo.error);
                else {
                  setLocalCounts((prev) => ({
                    ...prev,
                    [memberId]: Math.max(0, (prev[memberId] ?? 1) - 1),
                  }));
                  toast.info("Отменено");
                }
              });
            },
          },
          duration: 5000,
        });
      }

      if (navigator.vibrate) navigator.vibrate(50);
    });
  };

  const rowClass = embedded
    ? "grid w-full grid-cols-[minmax(0,1fr)_2.5rem_2.75rem] items-center gap-2 px-4 py-2.5"
    : "grid w-full grid-cols-[minmax(0,1fr)_2.5rem_2.75rem] items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5";

  const content = (
    <>
      <div
        className={cn(
          "flex items-center justify-between gap-2",
          embedded ? "px-4 py-3" : ""
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Users className="h-5 w-5 shrink-0 text-violet-400" />
          <span className="font-medium">Участники</span>
          {selectedIds.length > 0 && (
            <span className="rounded-full bg-violet-600/30 px-2 py-0.5 text-xs font-semibold text-violet-200">
              {selectedIds.length}
            </span>
          )}
        </span>
        <button
          type="button"
          data-add-trigger
          onClick={() => setAddOpen((v) => !v)}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
            addOpen
              ? "border-violet-500/50 bg-violet-600/30 text-violet-200"
              : "border-violet-500/50 bg-violet-600/20 text-violet-300 hover:bg-violet-600/40"
          )}
          aria-label="Добавить участника"
          aria-expanded={addOpen}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {addOpen && (
        <div
          className={cn(
            embedded ? "border-t border-zinc-800 bg-zinc-900/30" : "w-full overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900/95 shadow-xl"
          )}
        >
          <div className="p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск участника…"
                className="h-10 pl-9"
                autoFocus
              />
            </div>
          </div>

          <ul className="max-h-48 overflow-y-auto">
            {availableMembers.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-2 border-t border-zinc-800/80 px-4 py-2.5"
              >
                <span className="min-w-0 truncate font-medium text-zinc-200">
                  {member.display_name}
                </span>
                <button
                  type="button"
                  onClick={() => add(member.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-500/50 bg-violet-600/20 text-violet-300 hover:bg-violet-600/40"
                  aria-label={`Добавить ${member.display_name}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </li>
            ))}

            {availablePeople.length > 0 && (
              <>
                <li className="border-t border-zinc-800/80 px-4 pt-2 pb-1 text-xs text-zinc-500">
                  Из других лиг
                </li>
                {availablePeople.map((person) => (
                  <li
                    key={person.user_id}
                    className="flex items-center justify-between gap-2 px-4 py-2.5"
                  >
                    <span className="min-w-0 truncate font-medium text-zinc-200">
                      {person.display_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => addFromNetwork(person)}
                      disabled={pending}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-500/50 bg-violet-600/20 text-violet-300 hover:bg-violet-600/40 disabled:opacity-50"
                      aria-label={`Добавить ${person.display_name} в лигу`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </>
            )}

            {availableMembers.length === 0 && availablePeople.length === 0 && (
              <li className="px-4 py-4 text-center text-sm text-zinc-500">
                {allMembers.length === selectedIds.length && peopleCatalog.length === 0
                  ? "Все уже добавлены"
                  : "Никого не найдено"}
              </li>
            )}
          </ul>
        </div>
      )}

      {selectedParticipants.length > 0 && (
        <ul className={embedded ? "divide-y divide-zinc-800" : "flex flex-col gap-2"}>
          {selectedParticipants.map((member) => (
            <li key={member.id} className={embedded ? undefined : undefined}>
              <div className={rowClass}>
                <div className="flex min-w-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => remove(member.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                    aria-label={`Убрать ${member.display_name}`}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: memberColors[member.id] ?? "#8b5cf6",
                    }}
                  />
                  <span className="truncate font-medium text-zinc-100">
                    {member.display_name}
                  </span>
                </div>
                <span className="text-center text-lg font-bold tabular-nums text-violet-300">
                  {localCounts[member.id] ?? 0}
                </span>
                <button
                  type="button"
                  disabled={pending || winsDisabled}
                  onClick={() => handleWin(member.id, member.display_name)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-600/20 text-emerald-300 active:scale-95",
                    "hover:bg-emerald-600/35 disabled:opacity-40"
                  )}
                  aria-label={`Победа: ${member.display_name}`}
                >
                  <Plus className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  if (embedded) {
    return <div ref={panelRef}>{content}</div>;
  }

  return (
    <div ref={panelRef} className="flex w-full flex-col gap-2">
      <div
        className={cn(
          "rounded-2xl border border-zinc-700 bg-zinc-900/80",
          addOpen && "border-violet-500/50"
        )}
      >
        {content}
      </div>
    </div>
  );
}
