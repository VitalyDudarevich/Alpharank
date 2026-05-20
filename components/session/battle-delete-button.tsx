"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteBattle } from "@/lib/actions/arena";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BattleDeleteButtonProps = {
  sessionId: string;
  onDeleted: () => void;
  className?: string;
  /** Компактная кнопка в шапке карточки сражения */
  compact?: boolean;
};

export function BattleDeleteButton({
  sessionId,
  onDeleted,
  className,
  compact = false,
}: BattleDeleteButtonProps) {
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    const ok = window.confirm(
      "Удалить сражение безвозвратно? Все очки и история будут потеряны."
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteBattle(sessionId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Сражение удалено");
      onDeleted();
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        compact
          ? "h-9 shrink-0 gap-1.5 border-red-900/60 px-3 text-sm text-red-300 hover:bg-red-950/50 hover:text-red-200"
          : "h-12 w-full gap-2 border-red-900/60 text-red-300 hover:bg-red-950/50 hover:text-red-200",
        className
      )}
      disabled={pending}
      onClick={handleDelete}
    >
      <Trash2 className="h-4 w-4 shrink-0" />
      {pending ? "Удаление…" : compact ? "Удалить" : "Удалить сражение"}
    </Button>
  );
}
