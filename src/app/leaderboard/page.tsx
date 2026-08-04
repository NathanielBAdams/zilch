"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchLeaderboard, fetchRecentGames, type LeaderboardRow, type RecentGame } from "@/lib/db";

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [recentGames, setRecentGames] = useState<RecentGame[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchLeaderboard(), fetchRecentGames()])
      .then(([lb, games]) => {
        setRows(lb);
        setRecentGames(games);
      })
      .catch(() => setError("Couldn't load the leaderboard — check your connection and try again."));
  }, []);

  return (
    <div className="app">
      <h1>
        <span className="suit">♠</span> Zilch <span className="suit">♥</span>
      </h1>
      <div className="subtitle">All-time leaderboard</div>
      <Link href="/" className="btn btn-ghost">
        ← Back to game
      </Link>

      {error && <div className="setup-error">{error}</div>}

      <div className="card-panel">
        <label>Standings</label>
        {rows === null && !error && <p>Loading…</p>}
        {rows && rows.length === 0 && <p>No completed games yet — play one to get on the board.</p>}
        {rows && rows.length > 0 && (
          <table className="scoreboard">
            <thead>
              <tr>
                <th>Player</th>
                <th>Games</th>
                <th>Wins</th>
                <th>Bid %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const bidPct = r.roundsPlayed > 0 ? Math.round((r.bidsHit / r.roundsPlayed) * 100) : 0;
                const rowClass = i === 0 ? "leader" : i === rows.length - 1 ? "last" : "";
                return (
                  <tr className={`rank-row ${rowClass}`} key={r.playerId}>
                    <td>{r.name}</td>
                    <td>{r.gamesPlayed}</td>
                    <td className="total-score">{r.wins}</td>
                    <td>{bidPct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {recentGames && recentGames.length > 0 && (
        <div className="card-panel">
          <label>Recent games</label>
          {recentGames.map((g) => (
            <div className="stepper-row" key={g.id} style={{ flexDirection: "column", alignItems: "flex-start" }}>
              <div style={{ fontWeight: 700 }}>
                {g.winnerName ? `${g.winnerName} won` : "No winner recorded"}
                <span className="stepper-badge">{new Date(g.endedAt).toLocaleDateString()}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                {g.standings.map((s) => `${s.name} ${s.finalTotal}`).join(" · ")}
              </div>
            </div>
          ))}
        </div>
      )}

      <Link href="/players" className="btn btn-ghost">
        ⚙️ Manage Players
      </Link>

      <div className="footer-note">Zilch Scorekeeper</div>
    </div>
  );
}
