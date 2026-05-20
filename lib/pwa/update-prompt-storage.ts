const SESSION_ID_KEY = "alpharank-pwa-session-id";
const DISMISSED_SESSION_KEY = "alpharank-pwa-update-dismissed-session";

/** Идентификатор визита: новый при каждом открытии приложения (новая вкладка / PWA-сессия). */
export function getPwaSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

export function isPwaUpdatePostponed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DISMISSED_SESSION_KEY) === getPwaSessionId();
}

export function postponePwaUpdate(): void {
  localStorage.setItem(DISMISSED_SESSION_KEY, getPwaSessionId());
}

export function clearPwaUpdatePostpone(): void {
  localStorage.removeItem(DISMISSED_SESSION_KEY);
}
