"use client";

import { Fragment } from "react";
import { hitBid, suitColor } from "@/lib/gameLogic";
import type { GamePlayer, RoundHistoryEntry } from "@/lib/types";

type Props = {
  players: GamePlayer[];
  history: RoundHistoryEntry[];
};

export default function HistoryTable({ players, history }: Props) {
  if (history.length === 0) {
    return <p className="history-empty">No rounds played yet.</p>;
  }

  const running = players.map(() => 0);

  return (
    <table className="scoreboard history-table">
      <thead>
        <tr>
          <th>Player</th>
          <th>Bid</th>
          <th>Won</th>
          <th>Hit</th>
          <th>Pts</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {history.map((entry, roundIdx) => {
          const roundTotals = players.map((_, i) => (running[i] += entry.roundScores[i]));
          const leaderTotal = Math.max(...roundTotals);

          return (
            <Fragment key={roundIdx}>
              <tr className="history-section-row">
                <td colSpan={6}>
                  Round {roundIdx + 1} · {entry.round} card{entry.round === 1 ? "" : "s"}
                  {entry.trump && (
                    <span className={`trump-sym-sm ${suitColor(entry.trump)}`}>{entry.trump}</span>
                  )}
                </td>
              </tr>
              {players.map((p, i) => {
                const isLeader = roundTotals[i] === leaderTotal;
                return (
                  <tr key={p.id} className={isLeader ? "rank-row leader" : ""}>
                    <td>
                      <span className="player-cell-sm">
                        {isLeader && <span className="crown">👑</span>}
                        {p.name}
                      </span>
                    </td>
                    <td>{entry.bids[i]}</td>
                    <td>{entry.tricks[i]}</td>
                    <td>
                      {hitBid(entry.bids[i], entry.tricks[i]) ? (
                        <span className="hit-yes">✓</span>
                      ) : (
                        <span className="hit-no">–</span>
                      )}
                    </td>
                    <td className="pts-delta">+{entry.roundScores[i]}</td>
                    <td className="total-score">{roundTotals[i]}</td>
                  </tr>
                );
              })}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
