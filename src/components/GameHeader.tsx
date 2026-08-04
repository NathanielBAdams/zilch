"use client";

import { suitColor } from "@/lib/gameLogic";
import type { Phase } from "@/lib/types";
import type { Suit, Direction } from "@/lib/gameLogic";

type Props = {
  phase: Phase;
  round: number;
  direction: Direction;
  trump: Suit | null;
  historyCount: number;
  onStartOver: () => void;
  onShowHistory: () => void;
};

export default function GameHeader({
  phase,
  round,
  direction,
  trump,
  historyCount,
  onStartOver,
  onShowHistory,
}: Props) {
  const inActiveGame = phase === "bid" || phase === "tricks" || phase === "roundComplete";
  const showTrumpBanner = (phase === "tricks" || phase === "roundComplete") && trump;

  let subtitle = "Score keeper for the classic bidding trick game";
  if (inActiveGame) {
    subtitle = `Round ${round} · ${round} card${round > 1 ? "s" : ""} · ${direction === "up" ? "climbing" : "heading down"}`;
  }

  return (
    <div>
      <h1>
        <span className="suit">♠</span> Zilch <span className="suit">♥</span>
      </h1>
      <div className="subtitle">{subtitle}</div>
      {showTrumpBanner && trump && (
        <div className="trump-banner">
          Trump is <span className={`trump-sym ${suitColor(trump)}`}>{trump}</span>
        </div>
      )}
      {inActiveGame && historyCount > 0 && (
        <button className="btn btn-ghost" style={{ marginTop: 0 }} onClick={onShowHistory}>
          History
        </button>
      )}
      {inActiveGame && (
        <button className="btn btn-ghost" style={{ marginTop: 0 }} onClick={onStartOver}>
          Start Over
        </button>
      )}
    </div>
  );
}
