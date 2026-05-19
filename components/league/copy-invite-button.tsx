"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyInviteButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url = `${window.location.origin}/join/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" className="w-full" onClick={copy}>
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Скопировано!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Пригласить по ссылке
        </>
      )}
    </Button>
  );
}
