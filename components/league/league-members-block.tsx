"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import {
  addKnownMemberToLeague,
  fetchUserPeopleCatalog,
} from "@/lib/actions/members";
import type { CatalogPersonItem } from "@/lib/user-people-catalog";
import { InviteShareButton } from "@/components/league/copy-invite-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MemberRole } from "@/lib/types";

export type LeagueMemberListItem = {
  id?: string;
  user_id?: string;
  display_name: string;
  role: MemberRole;
};

type LeagueMembersBlockProps = {
  members: LeagueMemberListItem[];
  inviteToken?: string | null;
  leagueName?: string;
  leagueId?: string;
  allowAdd?: boolean;
  onMemberAdded?: (member: LeagueMemberListItem) => void;
  addDisabled?: boolean;
  pending?: boolean;
  /** Не показывать кнопку «Добавить» внутри блока (кнопка снаружи, внизу страницы). */
  hideAddButton?: boolean;
  pickerOpen?: boolean;
  onPickerOpenChange?: (open: boolean) => void;
};

export function LeagueMembersBlock({
  members,
  inviteToken,
  leagueName,
  leagueId,
  allowAdd = false,
  onMemberAdded,
  addDisabled = false,
  pending = false,
  hideAddButton = false,
  pickerOpen: pickerOpenProp,
  onPickerOpenChange,
}: LeagueMembersBlockProps) {
  const [pickerOpenInternal, setPickerOpenInternal] = useState(false);
  const pickerOpen = pickerOpenProp ?? pickerOpenInternal;
  const setPickerOpen = onPickerOpenChange ?? setPickerOpenInternal;
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<CatalogPersonItem[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [adding, startTransition] = useTransition();

  const busy = addDisabled || pending || adding;
  const memberUserIds = members
    .map((m) => m.user_id)
    .filter((id): id is string => !!id);
  const memberIdsKey = memberUserIds.slice().sort().join(",");

  useEffect(() => {
    if (!pickerOpen || !allowAdd) return;
    void fetchUserPeopleCatalog(leagueId).then((res) => {
      if (!res.error) setCatalog(res.catalog);
    });
  }, [pickerOpen, allowAdd, leagueId, memberIdsKey]);

  const memberIdSet = useMemo(() => new Set(memberUserIds), [memberIdsKey]);

  const available = useMemo(
    () => catalog.filter((p) => !memberIdSet.has(p.user_id)),
    [catalog, memberIdSet]
  );

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return available;
    return available.filter((p) =>
      p.display_name.toLowerCase().includes(q)
    );
  }, [available, q]);

  const closePicker = () => {
    setPickerOpen(false);
    setQuery("");
    setListOpen(false);
  };

  const addPerson = (person: CatalogPersonItem) => {
    if (busy || !onMemberAdded) return;

    if (!leagueId) {
      onMemberAdded({
        user_id: person.user_id,
        display_name: person.display_name,
        role: "member",
      });
      setCatalog((prev) => prev.filter((p) => p.user_id !== person.user_id));
      setQuery("");
      setListOpen(false);
      return;
    }

    startTransition(async () => {
      try {
        const result = await addKnownMemberToLeague(leagueId, person.user_id);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.member) {
          onMemberAdded(result.member);
          setCatalog((prev) => prev.filter((p) => p.user_id !== person.user_id));
          setQuery("");
          setListOpen(false);
        }
      } catch {
        // форма остаётся открытой
      }
    });
  };

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-400">
        <Users className="h-4 w-4" />
        Участники
        <span className="text-zinc-600">({members.length})</span>
      </h3>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
        <ul className="divide-y divide-zinc-800/80">
          {members.map((member) => (
            <li
              key={member.id ?? member.user_id ?? member.display_name}
              className="flex items-center justify-between gap-2 px-3 py-2.5"
            >
              <span className="min-w-0 truncate font-medium">
                {member.display_name}
              </span>
              {member.role === "owner" ? (
                <Badge variant="default" className="shrink-0">
                  Создатель
                </Badge>
              ) : (
                <span className="shrink-0 text-xs text-zinc-500">игрок</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {allowAdd && !hideAddButton && !pickerOpen && (
        <Button
          type="button"
          variant="outline"
          className="mt-3 mb-1 h-10 w-full border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800/80"
          disabled={busy}
          onClick={() => setPickerOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Добавить участника
        </Button>
      )}

      {allowAdd && pickerOpen && (
        <div className="mt-3 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setListOpen(true);
              }}
              onFocus={() => setListOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setListOpen(false), 150);
              }}
              placeholder={
                available.length > 0
                  ? "Поиск по людям из других лиг…"
                  : "Пока нет людей из других лиг"
              }
              className="h-10 pl-9"
              disabled={busy}
              autoFocus
            />
          </div>

          {listOpen && filtered.length > 0 && (
            <ul className="max-h-44 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900">
              <li className="px-3 pt-2 pb-1 text-xs text-zinc-500">
                Из ваших других лиг
              </li>
              {filtered.map((person) => (
                <li key={person.user_id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-zinc-800/80 disabled:opacity-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addPerson(person)}
                    disabled={busy}
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-zinc-200">
                      {person.display_name}
                    </span>
                    <Plus className="h-4 w-4 shrink-0 text-violet-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {inviteToken ? (
            <InviteShareButton token={inviteToken} leagueName={leagueName} />
          ) : (
            <p className="text-xs text-zinc-600">
              Ссылку для приглашения в мессенджер можно будет отправить после
              создания лиги.
            </p>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-zinc-500 hover:text-zinc-300"
            disabled={busy}
            onClick={closePicker}
          >
            Готово
          </Button>
        </div>
      )}
    </div>
  );
}
