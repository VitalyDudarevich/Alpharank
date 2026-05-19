/** Показывать нижнее меню и бургер на этих маршрутах (кроме гостевых). */
export function shouldShowAppNav(pathname: string) {
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth")
  ) {
    return false;
  }
  return pathname === "/" || pathname === "/stats" || pathname === "/profile";
}
