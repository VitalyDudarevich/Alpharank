import { redirect } from "next/navigation";

export default async function SettingsRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/league/${id}/league`);
}
