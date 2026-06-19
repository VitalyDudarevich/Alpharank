import { useEffect, useRef, useState } from "react";

type UsePullToRefreshOptions = {
  /** Что вызвать при достаточном свайпе вниз. */
  onRefresh: () => void | Promise<void>;
  /** Включён ли жест (например, только на главном списке). */
  enabled?: boolean;
  /** Порог срабатывания в пикселях. */
  threshold?: number;
};

/**
 * Pull-to-refresh для страниц, скроллящихся по окну. Жест активен только когда
 * страница прокручена в самый верх (`scrollY === 0`). Возвращает текущее
 * «натяжение» и флаг обновления для отрисовки индикатора.
 */
export function usePullToRefresh({
  onRefresh,
  enabled = true,
  threshold = 70,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;

    const setDistance = (d: number) => {
      distanceRef.current = d;
      setPullDistance(d);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      if (window.scrollY > 0 || e.touches.length !== 1) {
        startYRef.current = null;
        return;
      }
      startYRef.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null || refreshingRef.current) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        if (distanceRef.current !== 0) setDistance(0);
        return;
      }
      // Гасим нативный refresh/overscroll браузера, пока тянем вниз сверху.
      if (e.cancelable) e.preventDefault();
      // Сопротивление: тянется тяжелее у дна.
      setDistance(Math.min(delta * 0.5, threshold * 1.6));
    };

    const finish = async () => {
      if (startYRef.current === null) return;
      const shouldRefresh = distanceRef.current >= threshold;
      startYRef.current = null;

      if (!shouldRefresh) {
        setDistance(0);
        return;
      }

      refreshingRef.current = true;
      setRefreshing(true);
      setDistance(threshold);
      try {
        await onRefreshRef.current();
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
        setDistance(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", finish);
    window.addEventListener("touchcancel", finish);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", finish);
      window.removeEventListener("touchcancel", finish);
    };
  }, [enabled, threshold]);

  return { pullDistance, refreshing };
}
