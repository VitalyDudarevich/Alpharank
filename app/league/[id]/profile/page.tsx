import { redirect } from "next/navigation";

/** Старый/ошибочный путь из навигации — перенаправляем на глобальный профиль */
export default async function LeagueProfileRedirectPage() {
  redirect("/profile");
}
