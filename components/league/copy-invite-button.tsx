"use client";

import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InviteShareButtonProps = {
  token: string;
  className?: string;
  leagueName?: string;
};

export function InviteShareButton({
  token,
  className,
  leagueName,
}: InviteShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${token}`
      : `/join/${token}`;

  const shareText = leagueName
    ? `Присоединяйся к лиге «${leagueName}» в AlphaRank!`
    : "Присоединяйся к лиге в AlphaRank!";

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: leagueName ? `Лига «${leagueName}»` : "Приглашение в лигу",
          text: shareText,
          url: inviteUrl,
        });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    await navigator.clipboard.writeText(`${shareText}\n${inviteUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("w-full gap-2", className)}
      onClick={() => void share()}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Ссылка скопирована
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          Поделиться ссылкой
        </>
      )}
    </Button>
  );
}

/** @deprecated используйте InviteShareButton */
export function CopyInviteButton({
  token,
  className,
}: {
  token: string;
  className?: string;
}) {
  return <InviteShareButton token={token} className={className} />;
}
