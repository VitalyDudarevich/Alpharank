"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Link2, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteBattle } from "@/lib/actions/arena";
import { getBattleShareUrl } from "@/lib/battle-share";
import { cn } from "@/lib/utils";
import { BattleDeleteConfirmDialog } from "./battle-delete-confirm-dialog";

type BattleActionsMenuProps = {
  sessionId: string;
  canDelete?: boolean;
  onDeleted?: () => void;
  className?: string;
};

export function BattleActionsMenu({
  sessionId,
  canDelete = false,
  onDeleted,
  className,
}: BattleActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  const handleShare = async () => {
    setOpen(false);
    const url = getBattleShareUrl(sessionId);
    try {
      if (navigator.share) {
        await navigator.share({
          title: "alphaRank — сражение",
          url,
        });
        return;
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  const openDeleteConfirm = () => {
    setOpen(false);
    if (!onDeleted) return;
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!onDeleted) return;
    startTransition(async () => {
      const result = await deleteBattle(sessionId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setConfirmOpen(false);
      toast.success("Сражение удалено");
      onDeleted();
    });
  };

  const itemClass =
    "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-zinc-800 disabled:opacity-50";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Действия со сражением"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:text-zinc-200"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[11.5rem] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-2xl"
        >
          <button
            type="button"
            role="menuitem"
            className={cn(itemClass, "text-zinc-200")}
            onClick={() => void handleShare()}
          >
            <Link2 className="h-4 w-4 shrink-0 text-violet-400" />
            Поделиться
          </button>
          {canDelete && onDeleted && (
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              className={cn(itemClass, "text-red-300 hover:bg-red-950/40")}
              onClick={openDeleteConfirm}
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              {pending ? "Удаление…" : "Удалить"}
            </button>
          )}
        </div>
      )}

      <BattleDeleteConfirmDialog
        open={confirmOpen}
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
