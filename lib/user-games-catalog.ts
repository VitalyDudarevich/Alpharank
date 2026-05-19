export type CatalogGameItem = {
  name: string;
  target_wins: number | null;
};

type GameRow = {
  name: string;
  target_wins: number | null;
  league_id: string;
};

/** Уникальные игры по названию (регистронезависимо). */
export function mergeCatalogGames(rows: GameRow[], excludeLeagueId?: string) {
  const map = new Map<string, CatalogGameItem>();
  for (const g of rows) {
    if (excludeLeagueId && g.league_id === excludeLeagueId) continue;
    const key = g.name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { name: g.name, target_wins: g.target_wins });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "ru")
  );
}

export function catalogNotInNames(
  catalog: CatalogGameItem[],
  existingNames: Set<string>
) {
  return catalog.filter((c) => !existingNames.has(c.name.toLowerCase()));
}
