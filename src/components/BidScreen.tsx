"use client";

import { SUITS, type Suit } from "@/lib/gameLogic";
import type { GamePlayer } from "@/lib/types";

const SUIT_NAMES: Record<Suit, string> = { "♠": "Spades", "♥": "Hearts", "♦": "Diamonds", "♣": "Clubs" };

type Props = {
  players: GamePlayer[];
  round: number;
  trump: Suit | null;
  bids: number[];
  dealerName?: string;
  onTrumpChange: (suit: Suit) => void;
  onBidChange: (index: number, value: number) => void;
  onLockIn: () => void;
};

export default function BidScreen({ players, round, trump, bids, dealerName, onTrumpChange, onBidChange, onLockIn }: Props) {
  return (
    <div className="card-panel">
      <label>Trump suit {dealerName ? <>({dealerName}&apos;s flip)</> : <>(dealer&apos;s flip)</>}</label>
      {dealerName && (
        <div className="dealer-indicator">
          🃏 <strong>{dealerName}</strong> is dealing this round
        </div>
      )}
      <div className="suit-picker">
        {SUITS.map((s) => (
          <button
            key={s.sym}
            className={`${s.color} ${trump === s.sym ? "selected" : ""}`}
            onClick={() => onTrumpChange(s.sym)}
            aria-label={SUIT_NAMES[s.sym]}
            aria-pressed={trump === s.sym}
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
              <button
                aria-label={`Decrease ${p.name}'s bid`}
                onClick={() => onBidChange(i, Math.max(0, bids[i] - 1))}
                disabled={bids[i] <= 0}
              >
                −
              </button>
              <div className="val">{bids[i]}</div>
              <button
                aria-label={`Increase ${p.name}'s bid`}
                onClick={() => onBidChange(i, Math.min(round, bids[i] + 1))}
                disabled={bids[i] >= round}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {!trump && <div className="warn">Pick the trump suit before locking in bids.</div>}
      <button className="btn btn-primary" onClick={onLockIn} disabled={!trump}>
        Lock In Bids
      </button>
    </div>
  );
}
