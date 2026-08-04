"use client";

import { suitColor } from "@/lib/gameLogic";
import type { GamePlayer, RoundHistoryEntry } from "@/lib/types";

type Props = {
  players: GamePlayer[];
  history: RoundHistoryEntry[];
  onClose: () => void;
};

export default function HistoryModal({ players, history, onClose }: Props) {
  const entries = history.map((entry, idx) => ({ entry, idx })).reverse();

  return (
    <div className="overlay">
      <div className="modal">
        <h2>Round history</h2>

        {entries.map(({ entry, idx }) => (
          <div key={idx} style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              Round {idx + 1} · {entry.round} card{entry.round === 1 ? "" : "s"}
              {entry.trump && (
                <span className={`trump-sym ${suitColor(entry.trump)}`} style={{ fontSize: 20, marginLeft: 6 }}>
                  {entry.trump}
                </span>
              )}
            </div>
            <table className="scoreboard">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Bid</th>
                  <th>Won</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{entry.bids[i]}</td>
                    <td>{entry.tricks[i]}</td>
                    <td>+{entry.roundScores[i]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <button className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
