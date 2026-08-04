export type Suit = "♠" | "♥" | "♦" | "♣";

export const SUITS: { sym: Suit; color: "red" | "black" }[] = [
  { sym: "♠", color: "black" },
  { sym: "♥", color: "red" },
  { sym: "♦", color: "red" },
  { sym: "♣", color: "black" },
];

export function maxCardsFor(numPlayers: number): number {
  return Math.floor(52 / numPlayers);
}

export function scoreForRound(bid: number, tricksTaken: number): number {
  const made = tricksTaken === bid;
  return tricksTaken + (made ? 10 : 0);
}

export function hitBid(bid: number, tricksTaken: number): boolean {
  return tricksTaken === bid;
}

export type Direction = "up" | "down";

/**
 * Given the round just completed, figure out the next round's card count,
 * direction, and whether the game is over. Mirrors the prototype's
 * proceedToNextRound, minus the state mutation.
 */
export function nextRoundInfo(
  round: number,
  maxCards: number,
  direction: Direction,
  headDownEarly: boolean,
): { round: number; direction: Direction; gameOver: boolean } {
  let nextDirection = headDownEarly ? "down" : direction;
  let nextRound: number;

  if (nextDirection === "up") {
    if (round >= maxCards) {
      nextDirection = "down";
      nextRound = round - 1;
    } else {
      nextRound = round + 1;
    }
  } else {
    nextRound = round - 1;
  }

  return { round: nextRound, direction: nextDirection, gameOver: nextRound < 1 };
}

/** Label for the "Next Round" button, matching the prototype's logic. */
export function nextRoundLabel(round: number, maxCards: number, direction: Direction): string {
  const atMax = round >= maxCards && direction === "up";
  if (direction === "up" && !atMax) {
    return `Next Round (${round + 1} cards)`;
  }
  const upcoming = round - 1;
  return upcoming >= 1 ? `Next Round (${upcoming} card${upcoming === 1 ? "" : "s"})` : "Finish Game";
}

export function suitColor(sym: string): "red" | "black" {
  return SUITS.find((s) => s.sym === sym)?.color ?? "black";
}
