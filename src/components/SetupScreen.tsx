"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAllPlayers, type Player } from "@/lib/db";

const ADD_NEW = "__new__";
const RECENT_LIMIT = 10;

type Props = {
  onStart: (names: string[]) => void;
  starting: boolean;
  dbError: string | null;
};

export default function SetupScreen({ onStart, starting, dbError }: Props) {
  const [knownPlayers, setKnownPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [numPlayers, setNumPlayers] = useState(4);
  const [names, setNames] = useState<string[]>(["", "", "", ""]);
  const [textMode, setTextMode] = useState<boolean[]>([false, false, false, false]);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllPlayers()
      .then(setKnownPlayers)
      .catch(() => {
        // Non-fatal: setup still works via free-text entry, just no recent-player list.
      })
      .finally(() => setLoadingPlayers(false));
  }, []);

  const recentPlayers = knownPlayers.slice(0, RECENT_LIMIT);
  const hasUnselectedSlot = names.some((n, i) => !textMode[i] && n === "");

  function adjustPlayerCount(delta: number) {
    const next = numPlayers + delta;
    if (next < 2 || next > 12) return;
    setNumPlayers(next);
    setNames((prev) => {
      const copy = [...prev];
      while (copy.length < next) copy.push("");
      while (copy.length > next) copy.pop();
      return copy;
    });
    setTextMode((prev) => {
      const copy = [...prev];
      while (copy.length < next) copy.push(false);
      while (copy.length > next) copy.pop();
      return copy;
    });
  }

  function handleNameChange(i: number, value: string) {
    setNames((prev) => {
      const copy = [...prev];
      copy[i] = value;
      return copy;
    });
  }

  function handleSelectChange(i: number, value: string) {
    if (value === ADD_NEW) {
      setTextMode((prev) => prev.map((v, idx) => (idx === i ? true : v)));
      handleNameChange(i, "");
    } else {
      handleNameChange(i, value);
    }
  }

  function handleChooseExisting(i: number) {
    setTextMode((prev) => prev.map((v, idx) => (idx === i ? false : v)));
    handleNameChange(i, "");
  }

  function moveSlot(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= names.length) return;
    const swap = <T,>(arr: T[]) => {
      const copy = [...arr];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    };
    setNames(swap);
    setTextMode(swap);
  }

  function handleStart() {
    const finalNames = names.map((n, i) => n.trim() || `Player ${i + 1}`);
    const seen = new Set<string>();
    const dupes = new Set<string>();
    finalNames.forEach((n) => {
      const key = n.toLowerCase();
      if (seen.has(key)) dupes.add(n);
      seen.add(key);
    });
    if (dupes.size > 0) {
      setValidationError(`Player names must be unique — "${[...dupes][0]}" is used more than once.`);
      return;
    }
    setValidationError(null);
    onStart(finalNames);
  }

  return (
    <div className="card-panel">
      <label>Number of players</label>
      <div className="stepper-row" style={{ borderBottom: "none", paddingTop: 0 }}>
        <div className="stepper">
          <button aria-label="Decrease number of players" onClick={() => adjustPlayerCount(-1)} disabled={numPlayers <= 2}>
            −
          </button>
          <div className="val">{numPlayers}</div>
          <button aria-label="Increase number of players" onClick={() => adjustPlayerCount(1)} disabled={numPlayers >= 12}>
            +
          </button>
        </div>
      </div>

      <div className="field" style={{ marginTop: 10 }}>
        <label>Player names{loadingPlayers && <span style={{ fontWeight: 400, color: "var(--muted)" }}> · loading players…</span>}</label>
        <div className="seating-hint">Enter players in seating order, clockwise — the dealer indicator rotates from here.</div>
        <div>
          {names.map((name, i) => (
            <div className="name-input-row" key={i}>
              <div className="reorder-stack">
                <button
                  type="button"
                  aria-label={`Move player ${i + 1} up`}
                  onClick={() => moveSlot(i, -1)}
                  disabled={i === 0}
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={`Move player ${i + 1} down`}
                  onClick={() => moveSlot(i, 1)}
                  disabled={i === names.length - 1}
                >
                  ▼
                </button>
              </div>
              <div className="num">{i + 1}.</div>
              {textMode[i] ? (
                <>
                  <input
                    type="text"
                    placeholder={`Player ${i + 1}`}
                    value={name}
                    onChange={(e) => handleNameChange(i, e.target.value)}
                    autoFocus
                  />
                  {knownPlayers.length > 0 && (
                    <button
                      type="button"
                      className="name-mode-toggle"
                      onClick={() => handleChooseExisting(i)}
                      aria-label="Choose an existing player instead"
                    >
                      ↩
                    </button>
                  )}
                </>
              ) : (
                <select value={name} onChange={(e) => handleSelectChange(i, e.target.value)}>
                  <option value="" disabled>
                    Select player
                  </option>
                  {recentPlayers.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                  <option value={ADD_NEW}>+ Add new player</option>
                </select>
              )}
            </div>
          ))}
        </div>
      </div>

      {hasUnselectedSlot && !validationError && !dbError && (
        <div className="warn">Select a player (or add a new one) for every slot before starting.</div>
      )}
      {(validationError || dbError) && (
        <div className="setup-error">{validationError || dbError}</div>
      )}

      <button className="btn btn-primary" onClick={handleStart} disabled={starting || hasUnselectedSlot}>
        {starting ? "Starting…" : "Start Game"}
      </button>
      <Link href="/leaderboard" className="btn-ghost-on-light">
        🏆 View Leaderboard
      </Link>
    </div>
  );
}
