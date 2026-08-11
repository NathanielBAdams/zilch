import type { Direction, Suit } from "./gameLogic";
import type { RoundScoreInput } from "./db";

export type GamePlayer = {
  id: string;
  name: string;
  total: number;
  roundsHit: number;
};

export type RoundHistoryEntry = {
  round: number;
  trump: Suit | null;
  bids: number[];
  tricks: number[];
  roundScores: number[];
  roundId?: string;
  /** Client-only identity for this specific calculation, so a stale async save
   * from a since-superseded edit can never overwrite the wrong history entry. */
  localId: string;
};

export type Phase = "setup" | "bid" | "tricks" | "roundComplete" | "final";

export type GameState = {
  phase: Phase;
  gameId: string | null;
  players: GamePlayer[];
  round: number;
  direction: Direction;
  maxCards: number;
  trump: Suit | null;
  bids: number[];
  tricks: number[];
  history: RoundHistoryEntry[];
};

export function freshGameState(): GameState {
  return {
    phase: "setup",
    gameId: null,
    players: [],
    round: 1,
    direction: "up",
    maxCards: 13,
    trump: null,
    bids: [],
    tricks: [],
    history: [],
  };
}

export type PendingRoundSave = {
  localId: string;
  historyIndex: number;
  gameId: string;
  roundNumber: number;
  cardCount: number;
  trumpSuit: Suit | null;
  scores: RoundScoreInput[];
  /** Present when this save is overwriting an already-synced round rather than inserting a new one. */
  roundId: string | null;
};

export type EditingRound = {
  historyIndex: number;
  /** The round exactly as it was before editing began, so Cancel can restore it verbatim with no network call. */
  original: RoundHistoryEntry;
};

export type PendingFinalize = {
  gameId: string;
  winnerId: string;
  finalTotals: { playerId: string; total: number }[];
};
