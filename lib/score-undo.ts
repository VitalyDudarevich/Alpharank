/** Окно, в котором можно откатить чужое начисление очка (свои — всегда). */
export const SCORE_UNDO_WINDOW_MS = 20 * 60 * 1000;

export function canUndoScoreEvent(
  createdBy: string | null,
  createdAt: string,
  currentUserId: string
): boolean {
  if (createdBy === currentUserId) return true;
  return Date.now() - new Date(createdAt).getTime() < SCORE_UNDO_WINDOW_MS;
}
