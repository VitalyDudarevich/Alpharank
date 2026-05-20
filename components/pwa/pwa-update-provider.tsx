"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { PwaUpdatePrompt } from "@/components/pwa/pwa-update-prompt";
import { usePwaUpdate } from "@/lib/pwa/use-pwa-update";
import {
  clearPwaUpdatePostpone,
  isPwaUpdatePostponed,
  postponePwaUpdate,
} from "@/lib/pwa/update-prompt-storage";

type PwaUpdateContextValue = ReturnType<typeof usePwaUpdate>;

const PwaUpdateContext = createContext<PwaUpdateContextValue | null>(null);

export function PwaUpdateProvider({ children }: { children: ReactNode }) {
  const value = usePwaUpdate();
  const [promptOpen, setPromptOpen] = useState(false);

  const syncPrompt = useCallback(() => {
    if (value.status !== "available") {
      setPromptOpen(false);
      return;
    }
    setPromptOpen(!isPwaUpdatePostponed());
  }, [value.status]);

  useEffect(() => {
    syncPrompt();
  }, [syncPrompt]);

  useEffect(() => {
    if (!value.supported) return;
    void value.checkForUpdate();
  }, [value.supported, value.checkForUpdate]);

  useEffect(() => {
    if (!value.supported) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void value.checkForUpdate();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [value.supported, value.checkForUpdate]);

  const handlePostpone = useCallback(() => {
    postponePwaUpdate();
    setPromptOpen(false);
  }, []);

  const handleUpdate = useCallback(() => {
    clearPwaUpdatePostpone();
    value.applyUpdate();
  }, [value]);

  return (
    <PwaUpdateContext.Provider value={value}>
      {children}
      <PwaUpdatePrompt
        open={promptOpen}
        appVersion={value.appVersion}
        busy={value.busy}
        onUpdate={handleUpdate}
        onPostpone={handlePostpone}
      />
    </PwaUpdateContext.Provider>
  );
}

export function usePwaUpdateContext() {
  const ctx = useContext(PwaUpdateContext);
  if (!ctx) {
    throw new Error("usePwaUpdateContext must be used within PwaUpdateProvider");
  }
  return ctx;
}
