"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { usePwaUpdate } from "@/lib/pwa/use-pwa-update";

type PwaUpdateContextValue = ReturnType<typeof usePwaUpdate>;

const PwaUpdateContext = createContext<PwaUpdateContextValue | null>(null);

export function PwaUpdateProvider({ children }: { children: ReactNode }) {
  const value = usePwaUpdate();
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (value.status !== "available") {
      notifiedRef.current = false;
      return;
    }
    if (notifiedRef.current) return;
    notifiedRef.current = true;
    toast("Доступно обновление приложения", {
      description: "Установите без переустановки PWA",
      action: {
        label: "Установить",
        onClick: () => value.applyUpdate(),
      },
      duration: 12_000,
    });
  }, [value.status, value.applyUpdate]);

  return (
    <PwaUpdateContext.Provider value={value}>{children}</PwaUpdateContext.Provider>
  );
}

export function usePwaUpdateContext() {
  const ctx = useContext(PwaUpdateContext);
  if (!ctx) {
    throw new Error("usePwaUpdateContext must be used within PwaUpdateProvider");
  }
  return ctx;
}
