const DEFAULT_RATING = 1500;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function updateElo(
  winnerRating: number,
  loserRating: number,
  k: number,
  isDraw = false
): { winnerNew: number; loserNew: number } {
  const expectedWinner = expectedScore(winnerRating, loserRating);
  const expectedLoser = expectedScore(loserRating, winnerRating);

  if (isDraw) {
    return {
      winnerNew: winnerRating + k * (0.5 - expectedWinner),
      loserNew: loserRating + k * (0.5 - expectedLoser),
    };
  }

  return {
    winnerNew: winnerRating + k * (1 - expectedWinner),
    loserNew: loserRating + k * (0 - expectedLoser),
  };
}

export function updateMultiplayerElo(
  ratings: { memberId: string; rating: number }[],
  winnerId: string,
  k: number
): { memberId: string; rating: number }[] {
  const winner = ratings.find((r) => r.memberId === winnerId);
  if (!winner) return ratings;

  const losers = ratings.filter((r) => r.memberId !== winnerId);
  let winnerRating = winner.rating;

  const updated = ratings.map((r) => ({ ...r }));

  for (const loser of losers) {
    const result = updateElo(winnerRating, loser.rating, k / losers.length);
    winnerRating = result.winnerNew;
    const idx = updated.findIndex((u) => u.memberId === loser.memberId);
    if (idx >= 0) updated[idx].rating = result.loserNew;
  }

  const winnerIdx = updated.findIndex((u) => u.memberId === winnerId);
  if (winnerIdx >= 0) updated[winnerIdx].rating = winnerRating;

  return updated;
}

export { DEFAULT_RATING };
