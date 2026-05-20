"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getBattleShareUrl } from "@/lib/battle-share";

type BattleShareButtonProps = {
  sessionId: string;
  className?: string;
};

export function BattleShareButton({ sessionId, className }: BattleShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
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
      setCopied(true);
      toast.success("Ссылка скопирована");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={() => void handleShare()}
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Link2 className="h-4 w-4" />
      )}
      Поделиться
    </Button>
  );
}
