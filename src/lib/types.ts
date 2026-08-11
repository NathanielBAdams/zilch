import type { Direction, Suit } from "./gameLogic";

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
