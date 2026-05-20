"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PwaUpdateStatus =
  | "unsupported"
  | "idle"
  | "checking"
  | "current"
  | "available"
  | "updating";

function isLocalhost() {
  if (typeof window === "undefined") return false;
  const { hostname } = window.location;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function trackWaitingWorker(
  registration: ServiceWorkerRegistration,
  onWaiting: () => void
) {
  if (registration.waiting) {
    onWaiting();
    return;
  }

  const installing = registration.installing;
  if (!installing) return;

  installing.addEventListener("statechange", () => {
    if (
      installing.state === "installed" &&
      navigator.serviceWorker.controller
    ) {
      onWaiting();
    }
  });
}

export function usePwaUpdate() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [status, setStatus] = useState<PwaUpdateStatus>("idle");
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }

    if (process.env.NODE_ENV === "development" && isLocalhost()) {
      setStatus("unsupported");
      return;
    }

    setSupported(true);

    void fetch("/app-version.json", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { version?: string } | null) => {
        if (data?.version) setAppVersion(data.version);
      })
      .catch(() => {});

    let cancelled = false;

    const onWaiting = () => {
      if (!cancelled) setStatus("available");
    };

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        if (cancelled) return;
        registrationRef.current = registration;

        trackWaitingWorker(registration, onWaiting);
        registration.addEventListener("updatefound", () => {
          trackWaitingWorker(registration, onWaiting);
        });

        setStatus(registration.waiting ? "available" : "idle");
        void registration.update();
      })
      .catch(() => {
        if (!cancelled) setStatus("unsupported");
      });

    const onControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    const interval = window.setInterval(() => {
      void registrationRef.current?.update();
    }, 60 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (!supported) return;
    const registration = registrationRef.current;
    if (!registration) {
      setStatus("unsupported");
      return;
    }

    setStatus("checking");
    try {
      await registration.update();
      if (registration.waiting) {
        setStatus("available");
        return;
      }
      setStatus("current");
    } catch {
      setStatus("idle");
    }
  }, [supported]);

  const applyUpdate = useCallback(() => {
    const waiting = registrationRef.current?.waiting;
    if (!waiting) {
      void checkForUpdate();
      return;
    }

    setStatus("updating");
    waiting.postMessage({ type: "SKIP_WAITING" });
  }, [checkForUpdate]);

  return {
    supported,
    status,
    appVersion,
    checkForUpdate,
    applyUpdate,
    updateAvailable: status === "available",
    busy: status === "checking" || status === "updating",
  };
}
