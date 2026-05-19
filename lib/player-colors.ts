export const PLAYER_COLORS = [
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#a855f7",
  "#22d3ee",
] as const;

export function buildMemberColorMap(memberIds: string[]): Record<string, string> {
  return Object.fromEntries(
    memberIds.map((id, i) => [id, PLAYER_COLORS[i % PLAYER_COLORS.length]])
  );
}
