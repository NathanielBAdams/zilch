import { hitBid } from "./gameLogic";
import type { GamePlayer, RoundHistoryEntry } from "./types";

const APP_URL = "https://zilch-gold.vercel.app";

/**
 * A Wordle-style share recap: a row of squares per player (one per round,
 * green if they hit their bid) plus final scores — entirely derivable from
 * data already on hand, no image rendering involved.
 */
export function buildShareRecap(players: GamePlayer[], history: RoundHistoryEntry[]): string {
  const ranked = [...players].sort((a, b) => b.total - a.total);
  const topScore = ranked[0]?.total ?? 0;
  const winners = ranked.filter((p) => p.total === topScore);

  const headline =
    winners.length > 1
      ? `🤝 ${winners.map((w) => w.name).join(" & ")} tie at ${topScore}`
      : `🏆 ${winners[0].name} wins with ${topScore}`;

  const lines = ranked.map((p) => {
    const idx = players.findIndex((pl) => pl.id === p.id);
    const squares = history.map((round) => (hitBid(round.bids[idx], round.tricks[idx]) ? "🟩" : "⬜")).join("");
    return `${p.name} — ${squares} — ${p.total}`;
  });

  return [`♦ Zilch ♣ · ${history.length} round${history.length === 1 ? "" : "s"}`, headline, "", ...lines, "", APP_URL].join(
    "\n",
  );
}

export type ShareResult = "shared" | "copied" | "failed";

export async function shareRecap(text: string): Promise<ShareResult> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "shared";
      // Fall through to clipboard if the native share sheet itself errored.
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      return "failed";
    }
  }
  return "failed";
}
