"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import type { GamePlayer } from "@/lib/types";

type Props = {
  players: GamePlayer[];
  onStartNew: () => void;
};

const CONFETTI_COLORS = ["#e8b923", "#1f8a4c", "#ffffff"];

export default function FinalScreen({ players, onStartNew }: Props) {
  const ranked = [...players].sort((a, b) => b.total - a.total);
  const topScore = ranked[0].total;
  const lastScore = ranked[ranked.length - 1].total;
  const winners = ranked.filter((p) => p.total === topScore);
  const isTie = winners.length > 1;

  useEffect(() => {
    const shared = { colors: CONFETTI_COLORS, origin: { y: 0.6 } };
    confetti({ ...shared, particleCount: 50, spread: 26, startVelocity: 55 });
    confetti({ ...shared, particleCount: 40, spread: 60 });
    confetti({ ...shared, particleCount: 70, spread: 100, decay: 0.91, scalar: 0.8 });
    confetti({ ...shared, particleCount: 20, spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    confetti({ ...shared, particleCount: 20, spread: 120, startVelocity: 45 });
  }, []);

  return (
    <div className="card-panel center">
      <div className="trophy">🏆</div>
      {isTie ? (
        <>
          <div className="winner-name">It&apos;s a tie!</div>
          <div className="winner-score">
            {winners.map((w) => w.name).join(" & ")} — {topScore} points
          </div>
        </>
      ) : (
        <>
          <div className="winner-name">{winners[0].name} wins!</div>
          <div className="winner-score">{topScore} points</div>
        </>
      )}

      <table className="scoreboard" style={{ textAlign: "left" }}>
        <thead>
          <tr>
            <th>Player</th>
            <th>Bids hit</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((p) => {
            const rowClass = p.total === topScore ? "leader" : p.total === lastScore ? "last" : "";
            return (
              <tr className={`rank-row ${rowClass}`} key={p.id}>
                <td>{p.name}</td>
                <td>{p.roundsHit}</td>
                <td className="total-score">{p.total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={onStartNew}>
        Start New Game
      </button>
    </div>
  );
}
