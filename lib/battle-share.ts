/** Ссылка на сражение в публичной арене (гостевой просмотр). */
export function getBattleSharePath(sessionId: string): string {
  return `/?battle=${encodeURIComponent(sessionId)}`;
}

export function getBattleShareUrl(sessionId: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${getBattleSharePath(sessionId)}`;
}
