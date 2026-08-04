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
  syncIssue: boolean;
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
    syncIssue: false,
  };
}
