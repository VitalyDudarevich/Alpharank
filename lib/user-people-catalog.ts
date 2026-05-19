export type CatalogPersonItem = {
  user_id: string;
  display_name: string;
};

type MemberRow = {
  user_id: string;
  display_name: string;
  league_id: string;
};

/** Уникальные люди по user_id из лиг пользователя. */
export function mergePeopleCatalog(
  rows: MemberRow[],
  options?: { excludeUserIds?: Set<string> }
) {
  const map = new Map<string, CatalogPersonItem>();

  for (const row of rows) {
    if (options?.excludeUserIds?.has(row.user_id)) continue;
    if (!map.has(row.user_id)) {
      map.set(row.user_id, {
        user_id: row.user_id,
        display_name: row.display_name,
      });
    }
  }

  return [...map.values()].sort((a, b) =>
    a.display_name.localeCompare(b.display_name, "ru")
  );
}

export function peopleNotInLeague(
  catalog: CatalogPersonItem[],
  memberUserIds: Set<string>
) {
  return catalog.filter((p) => !memberUserIds.has(p.user_id));
}
