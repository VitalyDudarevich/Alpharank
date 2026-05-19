import { redirect } from "next/navigation";

export default async function LeagueTabRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/league/${id}/today`);
}
