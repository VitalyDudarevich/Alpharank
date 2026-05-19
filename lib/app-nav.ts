/** Показывать нижнее меню и бургер на этих маршрутах (кроме гостевых). */
export function shouldShowAppNav(pathname: string) {
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/join")
  ) {
    return false;
  }
  if (pathname === "/league/new") return false;
  if (/^\/league\/[^/]+/.test(pathname)) return true;
  if (pathname === "/profile" || pathname === "/" || pathname === "/arena")
    return true;
  return false;
}
