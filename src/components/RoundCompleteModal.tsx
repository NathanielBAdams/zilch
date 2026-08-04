"use client";

import { nextRoundLabel, type Direction } from "@/lib/gameLogic";
import type { GamePlayer, RoundHistoryEntry } from "@/lib/types";

type Props = {
  players: GamePlayer[];
  lastRound: RoundHistoryEntry;
  round: number;
  maxCards: number;
  direction: Direction;
  onNextRound: (headDownEarly: boolean) => void;
  onEndGame: () => void;
  onStartOver: () => void;
  onEditRound: () => void;
  onShowHistory: () => void;
};

export default function RoundCompleteModal({
  players,
  lastRound,
  round,
  maxCards,
  direction,
  onNextRound,
  onEndGame,
  onStartOver,
  onEditRound,
  onShowHistory,
}: Props) {
  const ranked = players.map((p, idx) => ({ ...p, idx })).sort((a, b) => b.total - a.total);
  const leaderTotal = ranked[0].total;
  const lastTotal = ranked[ranked.length - 1].total;
  const atMax = round >= maxCards && direction === "up";
  const label = nextRoundLabel(round, maxCards, direction);

  return (
    <div className="overlay">
      <div className="modal">
        <h2>Round {round} complete</h2>

        <table className="scoreboard">
          <thead>
            <tr>
              <th>Player</th>
              <th>Bid</th>
              <th>Won</th>
              <th>Round</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p) => {
              const made = lastRound.tricks[p.idx] === lastRound.bids[p.idx];
              const rowClass = p.total === leaderTotal ? "leader" : p.total === lastTotal ? "last" : "";
              const deficit = leaderTotal - p.total;
              return (
                <tr className={`rank-row ${rowClass}`} key={p.id}>
                  <td>
                    <div className="player-cell">
                      {made && <span className="made-star">★</span>}
                      {p.name}
                    </div>
                    {deficit > 0 && <span className="deficit">{deficit} behind leader</span>}
                  </td>
                  <td>{lastRound.bids[p.idx]}</td>
                  <td>{lastRound.tricks[p.idx]}</td>
                  <td>+{lastRound.roundScores[p.idx]}</td>
                  <td className="total-score">{p.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => onNextRound(false)}>
            {label}
          </button>
          {direction === "up" && !atMax && (
            <button className="btn btn-secondary" onClick={() => onNextRound(true)}>
              Head Back Down Early
            </button>
          )}
          <button className="btn btn-danger" onClick={onEndGame}>
            End Game Now
          </button>
          <button className="btn-ghost-on-light" onClick={onEditRound}>
            Edit This Round
          </button>
          <button className="btn-ghost-on-light" onClick={onShowHistory}>
            History
          </button>
          <button className="btn-ghost-on-light" onClick={onStartOver}>
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
}
