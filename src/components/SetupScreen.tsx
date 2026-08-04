"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAllPlayers, type Player } from "@/lib/db";

type Props = {
  onStart: (names: string[]) => void;
  starting: boolean;
  dbError: string | null;
};

export default function SetupScreen({ onStart, starting, dbError }: Props) {
  const [knownPlayers, setKnownPlayers] = useState<Player[]>([]);
  const [numPlayers, setNumPlayers] = useState(4);
  const [names, setNames] = useState<string[]>(["", "", "", ""]);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllPlayers()
      .then(setKnownPlayers)
      .catch(() => {
        // Non-fatal: setup still works with free-text names, just no autocomplete.
      });
  }, []);

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
  }

  function handleNameChange(i: number, value: string) {
    setNames((prev) => {
      const copy = [...prev];
      copy[i] = value;
      return copy;
    });
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
      <datalist id="known-players">
        {knownPlayers.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>

      <label>Number of players</label>
      <div className="stepper-row" style={{ borderBottom: "none", paddingTop: 0 }}>
        <div className="stepper">
          <button onClick={() => adjustPlayerCount(-1)} disabled={numPlayers <= 2}>
            −
          </button>
          <div className="val">{numPlayers}</div>
          <button onClick={() => adjustPlayerCount(1)} disabled={numPlayers >= 12}>
            +
          </button>
        </div>
      </div>

      <div className="field" style={{ marginTop: 10 }}>
        <label>Player names</label>
        <div>
          {names.map((name, i) => (
            <div className="name-input-row" key={i}>
              <div className="num">{i + 1}.</div>
              <input
                type="text"
                list="known-players"
                placeholder={`Player ${i + 1}`}
                value={name}
                onChange={(e) => handleNameChange(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {(validationError || dbError) && (
        <div className="setup-error">{validationError || dbError}</div>
      )}

      <button className="btn btn-primary" onClick={handleStart} disabled={starting}>
        {starting ? "Starting…" : "Start Game"}
      </button>
      <Link href="/leaderboard" className="btn-ghost-on-light">
        🏆 View Leaderboard
      </Link>
    </div>
  );
}
