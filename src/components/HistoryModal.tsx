"use client";

import { useState } from "react";
import type { GamePlayer, RoundHistoryEntry } from "@/lib/types";
import HistoryTable from "./HistoryTable";
import ScoreChart from "./ScoreChart";

type Props = {
  players: GamePlayer[];
  history: RoundHistoryEntry[];
  onClose: () => void;
};

export default function HistoryModal({ players, history, onClose }: Props) {
  const [view, setView] = useState<"table" | "graph">("table");

  return (
    <div className="overlay">
      <div className="modal">
        <h2>Round History</h2>

        <div className="history-tabs" role="tablist" aria-label="History view">
          <button
            type="button"
            role="tab"
            aria-selected={view === "table"}
            className={`history-tab ${view === "table" ? "active" : ""}`}
            onClick={() => setView("table")}
          >
            Table
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "graph"}
            className={`history-tab ${view === "graph" ? "active" : ""}`}
            onClick={() => setView("graph")}
          >
            Graph
          </button>
        </div>

        {view === "table" ? (
          <HistoryTable players={players} history={history} />
        ) : (
          <ScoreChart players={players} history={history} />
        )}

        <button className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
