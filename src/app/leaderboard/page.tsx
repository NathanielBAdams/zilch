"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchLeaderboard, fetchRecentGames, fetchPlayerStats, type LeaderboardRow, type RecentGame, type PlayerStats } from "@/lib/db";
import TrendChart from "@/components/TrendChart";

// Below this many rounds played, a hit-rate trend is mostly noise (a single
// miss swings it by 20-50 points) — hide the line rather than show something
// misleading.
const MIN_ROUNDS_FOR_TREND = 3;

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [recentGames, setRecentGames] = useState<RecentGame[] | null>(null);
  const [stats, setStats] = useState<Map<string, PlayerStats> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchLeaderboard(), fetchRecentGames(), fetchPlayerStats()])
      .then(([lb, games, playerStats]) => {
        setRows(lb);
        setRecentGames(games);
        setStats(playerStats);
      })
      .catch(() => setError("Couldn't load the leaderboard — check your connection and try again."));
  }, []);

  return (
    <div className="app">
      <h1>
        <span className="suit">♦</span> Zilch <span className="suit">♣</span>
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

      {rows && rows.length > 0 && stats && (
        <div className="card-panel">
          <label>Stats</label>
          <table className="scoreboard">
            <thead>
              <tr>
                <th>Player</th>
                <th>Avg Bid</th>
                <th>Avg Pts</th>
                <th>Best Round</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const s = stats.get(r.playerId);
                if (!s) return null;
                return (
                  <tr key={r.playerId}>
                    <td>{r.name}</td>
                    <td>{s.avgBid.toFixed(1)}</td>
                    <td>{s.avgPoints.toFixed(1)}</td>
                    <td className="total-score">{s.bestRound}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {(() => {
            const trendSeries = rows
              .map((r) => ({ id: r.playerId, name: r.name, points: stats.get(r.playerId)?.accuracyTrend ?? [] }))
              .filter((s) => s.points.length >= MIN_ROUNDS_FOR_TREND);
            return trendSeries.length > 0 ? (
              <>
                <div className="seating-hint" style={{ marginTop: 14 }}>
                  Bid accuracy over time (cumulative hit rate, one point per round played — players under{" "}
                  {MIN_ROUNDS_FOR_TREND} rounds omitted)
                </div>
                <TrendChart series={trendSeries} yDomain={[0, 100]} />
              </>
            ) : null;
          })()}
        </div>
      )}

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
