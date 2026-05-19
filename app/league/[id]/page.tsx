import { redirect } from "next/navigation";

export default async function LeagueIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/league/${id}/today`);
}
