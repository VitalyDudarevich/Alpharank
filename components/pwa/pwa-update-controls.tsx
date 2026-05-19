"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePwaUpdateContext } from "@/components/pwa/pwa-update-provider";

function statusMessage(
  supported: boolean,
  status: ReturnType<typeof usePwaUpdateContext>["status"]
) {
  if (!supported) {
    return "Обновление через приложение доступно в установленной PWA (не в режиме разработки).";
  }
  switch (status) {
    case "checking":
      return "Проверяем наличие новой версии…";
    case "current":
      return "У вас последняя версия приложения.";
    case "available":
      return "Доступно обновление. Нажмите «Установить», страница перезагрузится.";
    case "updating":
      return "Устанавливаем обновление…";
    default:
      return "Проверьте обновления после выкладки новой версии на сервер.";
  }
}

type PwaUpdateControlsProps = {
  variant?: "card" | "menu";
  className?: string;
  onAction?: () => void;
};

export function PwaUpdateControls({
  variant = "card",
  className,
  onAction,
}: PwaUpdateControlsProps) {
  const { supported, status, appVersion, checkForUpdate, applyUpdate, busy, updateAvailable } =
    usePwaUpdateContext();

  const handlePrimary = () => {
    if (updateAvailable) {
      applyUpdate();
    } else {
      void checkForUpdate();
    }
    onAction?.();
  };

  const primaryLabel = updateAvailable
    ? busy
      ? "Установка…"
      : "Установить обновление"
    : busy
      ? "Проверка…"
      : "Проверить обновления";

  if (variant === "menu") {
    if (!supported) return null;

    return (
      <div className={cn("space-y-2", className)}>
        <p className="px-1 text-xs text-zinc-500">
          {statusMessage(supported, status)}
          {appVersion ? ` · ${appVersion}` : ""}
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full border-zinc-700 text-zinc-200"
          disabled={busy}
          onClick={handlePrimary}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", busy && "animate-spin")} />
          {primaryLabel}
        </Button>
      </div>
    );
  }

  return (
    <Card className={cn("space-y-3 p-4", className)}>
      <div>
        <h2 className="text-sm font-medium text-zinc-300">Обновление приложения</h2>
        <p className="mt-1 text-xs text-zinc-500">
          {statusMessage(supported, status)}
        </p>
        {appVersion && (
          <p className="mt-1 text-xs text-zinc-600">Версия: {appVersion}</p>
        )}
      </div>
      {supported && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={busy}
          onClick={handlePrimary}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", busy && "animate-spin")} />
          {primaryLabel}
        </Button>
      )}
    </Card>
  );
}
