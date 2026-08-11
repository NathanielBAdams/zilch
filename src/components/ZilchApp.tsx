"use client";

import { useState } from "react";
import { freshGameState, type GameState, type RoundHistoryEntry } from "@/lib/types";
import { maxCardsFor, nextRoundInfo, scoreForRound, hitBid, type Suit } from "@/lib/gameLogic";
import {
  findOrCreatePlayer,
  createGame,
  saveRoundResult,
  updateRoundResult,
  finalizeGame,
  deleteEmptyGame,
  type RoundScoreInput,
} from "@/lib/db";

type PendingRoundSave = {
  localId: string;
  historyIndex: number;
  gameId: string;
  roundNumber: number;
  cardCount: number;
  trumpSuit: Suit | null;
  scores: RoundScoreInput[];
  /** Present when this save is overwriting an already-synced round rather than inserting a new one. */
  roundId: string | null;
};

type EditingRound = {
  historyIndex: number;
  /** The round exactly as it was before editing began, so Cancel can restore it verbatim with no network call. */
  original: RoundHistoryEntry;
};

type PendingFinalize = {
  gameId: string;
  winnerId: string;
  finalTotals: { playerId: string; total: number }[];
};
import GameHeader from "./GameHeader";
import OfflineBanner from "./OfflineBanner";
import SetupScreen from "./SetupScreen";
import BidScreen from "./BidScreen";
import TricksScreen from "./TricksScreen";
import RoundCompleteModal from "./RoundCompleteModal";
import FinalScreen from "./FinalScreen";
import HistoryModal from "./HistoryModal";

export default function ZilchApp() {
  const [state, setState] = useState<GameState>(() => freshGameState());
  const [starting, setStarting] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [failedSaves, setFailedSaves] = useState<PendingRoundSave[]>([]);
  const [failedFinalize, setFailedFinalize] = useState<PendingFinalize | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingRound, setEditingRound] = useState<EditingRound | null>(null);

  async function handleStart(names: string[]) {
    setStarting(true);
    setDbError(null);
    try {
      const resolved = await Promise.all(names.map((n) => findOrCreatePlayer(n)));
      const maxCards = maxCardsFor(names.length);
      const gameId = await createGame(
        maxCards,
        resolved.map((p, i) => ({ playerId: p.id, seatOrder: i })),
      );
      setState({
        ...freshGameState(),
        phase: "bid",
        gameId,
        maxCards,
        players: resolved.map((p) => ({ id: p.id, name: p.name, total: 0, roundsHit: 0 })),
        bids: resolved.map(() => 0),
        tricks: resolved.map(() => 0),
      });
    } catch {
      setDbError("Couldn't start the game — check your connection and try again.");
    } finally {
      setStarting(false);
    }
  }

  function handleTrumpChange(suit: Suit) {
    setState((prev) => ({ ...prev, trump: suit }));
  }

  function handleBidChange(index: number, value: number) {
    setState((prev) => {
      const bids = [...prev.bids];
      bids[index] = value;
      return { ...prev, bids };
    });
  }

  function handleLockIn() {
    setState((prev) => ({ ...prev, phase: "tricks" }));
  }

  function handleTrickChange(index: number, value: number) {
    setState((prev) => {
      const tricks = [...prev.tricks];
      tricks[index] = value;
      return { ...prev, tricks };
    });
  }

  function handleCalculate() {
    const roundScores = state.players.map((_, i) => scoreForRound(state.bids[i], state.tricks[i]));
    const updatedPlayers = state.players.map((p, i) => ({
      ...p,
      total: p.total + roundScores[i],
      roundsHit: p.roundsHit + (hitBid(state.bids[i], state.tricks[i]) ? 1 : 0),
    }));
    const localId = crypto.randomUUID();
    const overwritingRoundId = editingRound?.original.roundId ?? null;
    const historyEntry: RoundHistoryEntry = {
      round: state.round,
      trump: state.trump,
      bids: [...state.bids],
      tricks: [...state.tricks],
      roundScores,
      roundId: overwritingRoundId ?? undefined,
      localId,
    };
    const historyIndex = editingRound?.historyIndex ?? state.history.length;

    setState((prev) => ({
      ...prev,
      players: updatedPlayers,
      history: [...prev.history, historyEntry],
      phase: "roundComplete",
    }));
    setEditingRound(null);

    if (state.gameId) {
      const gameId = state.gameId;
      const roundNumber = historyIndex + 1;
      const scores = state.players.map((p, i) => ({
        playerId: p.id,
        bid: state.bids[i],
        tricksTaken: state.tricks[i],
        points: roundScores[i],
      }));

      const persist = overwritingRoundId
        ? updateRoundResult(overwritingRoundId, state.trump, scores).then(() => overwritingRoundId)
        : saveRoundResult(gameId, roundNumber, state.round, state.trump, scores);

      persist
        .then((roundId) => {
          setState((s) => {
            const history = [...s.history];
            const idx = history.findIndex((h) => h.localId === localId);
            if (idx !== -1) history[idx] = { ...history[idx], roundId };
            return { ...s, history };
          });
        })
        .catch(() => {
          setFailedSaves((prev) => [
            ...prev,
            {
              localId,
              historyIndex,
              gameId,
              roundNumber,
              cardCount: state.round,
              trumpSuit: state.trump,
              scores,
              roundId: overwritingRoundId,
            },
          ]);
        });
    }
  }

  function handleEditRound() {
    const lastRound = state.history[state.history.length - 1];
    if (!lastRound) return;

    const historyIndex = state.history.length - 1;

    // Drop any not-yet-synced save for this round — otherwise a later "Retry
    // Sync" could resurrect the pre-edit numbers as a duplicate round.
    setFailedSaves((prev) => prev.filter((s) => s.historyIndex !== historyIndex));
    setEditingRound({ historyIndex, original: lastRound });

    setState((prev) => {
      const revertedPlayers = prev.players.map((p, i) => ({
        ...p,
        total: p.total - lastRound.roundScores[i],
        roundsHit: p.roundsHit - (hitBid(lastRound.bids[i], lastRound.tricks[i]) ? 1 : 0),
      }));
      return {
        ...prev,
        players: revertedPlayers,
        history: prev.history.slice(0, -1),
        phase: "bid",
        trump: lastRound.trump,
        bids: [...lastRound.bids],
        tricks: [...lastRound.tricks],
      };
    });
  }

  /** Backs out of an in-progress edit and restores the round exactly as it was — purely local, no network call. */
  function handleCancelEdit() {
    if (!editingRound) return;
    const { original } = editingRound;

    setState((prev) => {
      const restoredPlayers = prev.players.map((p, i) => ({
        ...p,
        total: p.total + original.roundScores[i],
        roundsHit: p.roundsHit + (hitBid(original.bids[i], original.tricks[i]) ? 1 : 0),
      }));
      return {
        ...prev,
        players: restoredPlayers,
        history: [...prev.history, original],
        phase: "roundComplete",
        trump: original.trump,
        bids: [...original.bids],
        tricks: [...original.tricks],
      };
    });
    setEditingRound(null);
  }

  function finishGame(finalPlayers: GameState["players"], gameId: string | null) {
    if (!gameId) return;
    const ranked = [...finalPlayers].sort((a, b) => b.total - a.total);
    const winner = ranked[0];
    const finalTotals = finalPlayers.map((p) => ({ playerId: p.id, total: p.total }));
    finalizeGame(gameId, winner.id, finalTotals).catch(() => {
      setFailedFinalize({ gameId, winnerId: winner.id, finalTotals });
    });
  }

  function proceedNextRound(headDownEarly: boolean) {
    const info = nextRoundInfo(state.round, state.maxCards, state.direction, headDownEarly);
    if (info.gameOver) {
      setState((prev) => ({ ...prev, phase: "final" }));
      finishGame(state.players, state.gameId);
      return;
    }
    setState((prev) => ({
      ...prev,
      phase: "bid",
      round: info.round,
      direction: info.direction,
      trump: null,
      bids: prev.players.map(() => 0),
      tricks: prev.players.map(() => 0),
    }));
  }

  function handleNextRound(headDownEarly: boolean) {
    if (headDownEarly && state.round === 1) {
      setPendingConfirm({
        title: "Head back down now?",
        message: "You're still on round 1 — heading back down now ends the game immediately.",
        onConfirm: () => proceedNextRound(true),
      });
      return;
    }
    proceedNextRound(headDownEarly);
  }

  function handleEndGameNow() {
    setPendingConfirm({
      title: "End game now?",
      message: "This ends the game immediately and records the current standings as final.",
      onConfirm: () => {
        setState((prev) => ({ ...prev, phase: "final" }));
        finishGame(state.players, state.gameId);
      },
    });
  }

  function handleStartOver() {
    setPendingConfirm({
      title: "Start over?",
      message: "This abandons the current game. The scores already saved won't be affected.",
      onConfirm: () => {
        // editingRound means the only played round is transiently popped out of
        // history for editing — the game is not actually empty, and deleting it
        // would cascade-delete that already-synced round.
        if (state.gameId && state.history.length === 0 && !editingRound) {
          deleteEmptyGame(state.gameId).catch(() => {});
        }
        setState(freshGameState());
        setDbError(null);
        setFailedSaves([]);
        setFailedFinalize(null);
        setShowHistory(false);
        setEditingRound(null);
      },
    });
  }

  function handleStartNew() {
    setState(freshGameState());
    setDbError(null);
    setFailedSaves([]);
    setFailedFinalize(null);
    setShowHistory(false);
    setEditingRound(null);
  }

  async function handleRetrySync() {
    for (const save of failedSaves) {
      try {
        const roundId = save.roundId
          ? await updateRoundResult(save.roundId, save.trumpSuit, save.scores).then(() => save.roundId as string)
          : await saveRoundResult(save.gameId, save.roundNumber, save.cardCount, save.trumpSuit, save.scores);
        setFailedSaves((prev) => prev.filter((s) => s !== save));
        setState((s) => {
          const history = [...s.history];
          const idx = history.findIndex((h) => h.localId === save.localId);
          if (idx !== -1) history[idx] = { ...history[idx], roundId };
          return { ...s, history };
        });
      } catch {
        // Leave it in the queue; the user can retry again.
      }
    }

    if (failedFinalize) {
      try {
        await finalizeGame(failedFinalize.gameId, failedFinalize.winnerId, failedFinalize.finalTotals);
        setFailedFinalize(null);
      } catch {
        // Leave it in place for another retry.
      }
    }
  }

  const lastRound = state.history[state.history.length - 1];

  return (
    <div className="app">
      <GameHeader
        phase={state.phase}
        round={state.round}
        direction={state.direction}
        trump={state.trump}
        historyCount={state.history.length}
        onStartOver={handleStartOver}
        onShowHistory={() => setShowHistory(true)}
      />

      <OfflineBanner />

      {editingRound && (state.phase === "bid" || state.phase === "tricks") && (
        <div className="edit-round-banner">
          <span>✏️ Editing Round {editingRound.historyIndex + 1}</span>
          <button className="btn-ghost-on-light" style={{ margin: 0, padding: 0 }} onClick={handleCancelEdit}>
            Cancel Edit
          </button>
        </div>
      )}

      {state.phase === "setup" && <SetupScreen onStart={handleStart} starting={starting} dbError={dbError} />}

      {state.phase === "bid" && (
        <BidScreen
          players={state.players}
          round={state.round}
          trump={state.trump}
          bids={state.bids}
          onTrumpChange={handleTrumpChange}
          onBidChange={handleBidChange}
          onLockIn={handleLockIn}
        />
      )}

      {state.phase === "tricks" && (
        <TricksScreen
          players={state.players}
          round={state.round}
          trump={state.trump}
          bids={state.bids}
          tricks={state.tricks}
          onTrickChange={handleTrickChange}
          onCalculate={handleCalculate}
        />
      )}

      {state.phase === "roundComplete" && lastRound && (
        <RoundCompleteModal
          players={state.players}
          lastRound={lastRound}
          round={state.round}
          maxCards={state.maxCards}
          direction={state.direction}
          onNextRound={handleNextRound}
          onEndGame={handleEndGameNow}
          onStartOver={handleStartOver}
          onEditRound={handleEditRound}
          onShowHistory={() => setShowHistory(true)}
        />
      )}

      {showHistory && (
        <HistoryModal players={state.players} history={state.history} onClose={() => setShowHistory(false)} />
      )}

      {state.phase === "final" && <FinalScreen players={state.players} onStartNew={handleStartNew} />}

      {pendingConfirm && (
        <div className="overlay">
          <div className="modal">
            <h2>{pendingConfirm.title}</h2>
            <p>{pendingConfirm.message}</p>
            <button
              className="btn btn-danger"
              onClick={() => {
                pendingConfirm.onConfirm();
                setPendingConfirm(null);
              }}
            >
              Yes, Continue
            </button>
            <button className="btn btn-secondary" onClick={() => setPendingConfirm(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {(failedSaves.length > 0 || failedFinalize) && (
        <div className="warn sync-banner">
          {failedSaves.length + (failedFinalize ? 1 : 0)} update
          {failedSaves.length + (failedFinalize ? 1 : 0) === 1 ? "" : "s"} didn&apos;t sync to the cloud —
          scores on this screen are still correct.
          <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={handleRetrySync}>
            Retry Sync
          </button>
        </div>
      )}

      <div className="footer-note">Zilch Scorekeeper</div>
    </div>
  );
}
