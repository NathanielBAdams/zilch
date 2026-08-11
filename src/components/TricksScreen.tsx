"use client";

import type { Suit } from "@/lib/gameLogic";
import type { GamePlayer } from "@/lib/types";

type Props = {
  players: GamePlayer[];
  round: number;
  trump: Suit | null;
  bids: number[];
  tricks: number[];
  onTrickChange: (index: number, value: number) => void;
  onCalculate: () => void;
};

export default function TricksScreen({ players, round, bids, tricks, onTrickChange, onCalculate }: Props) {
  const sum = tricks.reduce((a, b) => a + b, 0);
  const ok = sum === round;

  return (
    <div className="card-panel">
      <div className="warn" style={ok ? { background: "#eafaf0", borderColor: "#bfe6cc", color: "#1f8a4c" } : undefined}>
        Tricks entered: {sum} / {round} {ok ? "✓ matches cards dealt" : `— must add up to exactly ${round} to continue`}
      </div>

      <label>Tricks taken</label>
      <div>
        {players.map((p, i) => (
          <div className="stepper-row" key={p.id}>
            <div className="stepper-name">
              {p.name}
              <span className="stepper-badge">bid {bids[i]}</span>
            </div>
            <div className="stepper">
              <button
                aria-label={`Decrease ${p.name}'s tricks taken`}
                onClick={() => onTrickChange(i, Math.max(0, tricks[i] - 1))}
                disabled={tricks[i] <= 0}
              >
                −
              </button>
              <div className="val">{tricks[i]}</div>
              <button
                aria-label={`Increase ${p.name}'s tricks taken`}
                onClick={() => onTrickChange(i, Math.min(round, tricks[i] + 1))}
                disabled={tricks[i] >= round}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary" onClick={onCalculate} disabled={!ok}>
        Calculate Scores
      </button>
    </div>
  );
}
