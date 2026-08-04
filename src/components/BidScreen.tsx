"use client";

import { SUITS, type Suit } from "@/lib/gameLogic";
import type { GamePlayer } from "@/lib/types";

type Props = {
  players: GamePlayer[];
  round: number;
  trump: Suit | null;
  bids: number[];
  onTrumpChange: (suit: Suit) => void;
  onBidChange: (index: number, value: number) => void;
  onLockIn: () => void;
};

export default function BidScreen({ players, round, trump, bids, onTrumpChange, onBidChange, onLockIn }: Props) {
  return (
    <div className="card-panel">
      <label>Trump suit (dealer&apos;s flip)</label>
      <div className="suit-picker">
        {SUITS.map((s) => (
          <button
            key={s.sym}
            className={`${s.color} ${trump === s.sym ? "selected" : ""}`}
            onClick={() => onTrumpChange(s.sym)}
          >
            {s.sym}
          </button>
        ))}
      </div>

      <label>Bids (0 to {round})</label>
      <div>
        {players.map((p, i) => (
          <div className="stepper-row" key={p.id}>
            <div className="stepper-name">{p.name}</div>
            <div className="stepper">
              <button onClick={() => onBidChange(i, Math.max(0, bids[i] - 1))} disabled={bids[i] <= 0}>
                −
              </button>
              <div className="val">{bids[i]}</div>
              <button onClick={() => onBidChange(i, Math.min(round, bids[i] + 1))} disabled={bids[i] >= round}>
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary" onClick={onLockIn}>
        Lock In Bids
      </button>
    </div>
  );
}
