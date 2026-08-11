import type { EditingRound, GameState, PendingFinalize, PendingRoundSave } from "./types";

const STORAGE_KEY = "zilch:activeGame:v1";

export type PersistedGame = {
  state: GameState;
  editingRound: EditingRound | null;
  failedSaves: PendingRoundSave[];
  failedFinalize: PendingFinalize | null;
};

/**
 * Only a loose shape check, not full validation — this just needs to catch a
 * corrupted or pre-this-feature blob so we fall back to a fresh game instead
 * of crashing on a malformed resume.
 */
function looksValid(value: unknown): value is PersistedGame {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const state = v.state as Record<string, unknown> | undefined;
  return (
    !!state &&
    typeof state === "object" &&
    Array.isArray(state.players) &&
    Array.isArray(state.bids) &&
    Array.isArray(state.tricks) &&
    Array.isArray(state.history) &&
    typeof state.phase === "string"
  );
}

export function loadPersistedGame(): PersistedGame | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return looksValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function savePersistedGame(data: PersistedGame): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable (private browsing, etc.) — the game just
    // won't survive a reload this time, nothing else depends on this write.
  }
}

export function clearPersistedGame(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do — worst case a stale blob lingers and fails looksValid later.
  }
}
