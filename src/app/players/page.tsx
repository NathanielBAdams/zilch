"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAllPlayersAlphabetical, renamePlayer, deletePlayer, type Player } from "@/lib/db";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  function load() {
    fetchAllPlayersAlphabetical()
      .then((data) => {
        setPlayers(data);
        setDrafts(Object.fromEntries(data.map((p) => [p.id, p.name])));
      })
      .catch(() => setLoadError("Couldn't load players — check your connection and try again."));
  }

  useEffect(load, []);

  function setRowError(id: string, message: string | null) {
    setRowErrors((prev) => {
      const next = { ...prev };
      if (message) next[id] = message;
      else delete next[id];
      return next;
    });
  }

  async function handleRename(player: Player) {
    const draft = (drafts[player.id] || "").trim();
    if (!draft || draft === player.name) return;
    try {
      await renamePlayer(player.id, draft);
      setRowError(player.id, null);
      load();
    } catch {
      setRowError(player.id, "Couldn't rename — that name may already be in use.");
    }
  }

  async function handleDelete(player: Player) {
    try {
      await deletePlayer(player.id);
      setRowError(player.id, null);
      load();
    } catch {
      setRowError(player.id, "Can't delete — this player has game history.");
    }
  }

  return (
    <div className="app">
      <h1>
        <span className="suit">♠</span> Zilch <span className="suit">♥</span>
      </h1>
      <div className="subtitle">Manage players</div>
      <Link href="/leaderboard" className="btn btn-ghost">
        ← Back to leaderboard
      </Link>

      {loadError && <div className="setup-error">{loadError}</div>}

      <div className="card-panel">
        <label>All players</label>
        {players === null && !loadError && <p>Loading…</p>}
        {players && players.length === 0 && <p>No players yet.</p>}
        {players?.map((p) => (
          <div key={p.id}>
            <div className="name-input-row">
              <input
                type="text"
                value={drafts[p.id] ?? p.name}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
              />
              <button
                type="button"
                className="name-mode-toggle"
                aria-label={`Save name for ${p.name}`}
                disabled={!drafts[p.id]?.trim() || drafts[p.id].trim() === p.name}
                onClick={() => handleRename(p)}
              >
                ✓
              </button>
              <button
                type="button"
                className="name-mode-toggle"
                aria-label={`Delete ${p.name}`}
                onClick={() => handleDelete(p)}
              >
                ✕
              </button>
            </div>
            {rowErrors[p.id] && <div className="setup-error">{rowErrors[p.id]}</div>}
          </div>
        ))}
      </div>

      <div className="footer-note">Zilch Scorekeeper</div>
    </div>
  );
}
