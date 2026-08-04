"use client";

import { useState } from "react";
import { freshGameState, type GameState } from "@/lib/types";
import { maxCardsFor, nextRoundInfo, scoreForRound, hitBid, type Suit } from "@/lib/gameLogic";
import { findOrCreatePlayer, createGame, saveRoundResult, finalizeGame } from "@/lib/db";
import GameHeader from "./GameHeader";
import SetupScreen from "./SetupScreen";
import BidScreen from "./BidScreen";
import TricksScreen from "./TricksScreen";
import RoundCompleteModal from "./RoundCompleteModal";
import FinalScreen from "./FinalScreen";

export default function ZilchApp() {
  const [state, setState] = useState<GameState>(() => freshGameState());
  const [starting, setStarting] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

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
    setState((prev) => ({ ...prev, phase: "tricks", tricks: prev.players.map(() => 0) }));
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
    const historyEntry = {
      round: state.round,
      trump: state.trump,
      bids: [...state.bids],
      tricks: [...state.tricks],
      roundScores,
    };

    setState((prev) => ({
      ...prev,
      players: updatedPlayers,
      history: [...prev.history, historyEntry],
      phase: "roundComplete",
    }));

    if (state.gameId) {
      const roundNumber = state.history.length + 1;
      saveRoundResult(
        state.gameId,
        roundNumber,
        state.round,
        state.trump,
        state.players.map((p, i) => ({
          playerId: p.id,
          bid: state.bids[i],
          tricksTaken: state.tricks[i],
          points: roundScores[i],
        })),
      ).catch(() => setState((s) => ({ ...s, syncIssue: true })));
    }
  }

  function finishGame(finalPlayers: GameState["players"], gameId: string | null) {
    if (!gameId) return;
    const ranked = [...finalPlayers].sort((a, b) => b.total - a.total);
    const winner = ranked[0];
    finalizeGame(
      gameId,
      winner.id,
      finalPlayers.map((p) => ({ playerId: p.id, total: p.total })),
    ).catch(() => setState((s) => ({ ...s, syncIssue: true })));
  }

  function handleNextRound(headDownEarly: boolean) {
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
    }));
  }

  function handleEndGameNow() {
    setState((prev) => ({ ...prev, phase: "final" }));
    finishGame(state.players, state.gameId);
  }

  function handleStartOver() {
    if (!window.confirm("Start over? This abandons the current game.")) return;
    setState(freshGameState());
    setDbError(null);
  }

  function handleStartNew() {
    setState(freshGameState());
    setDbError(null);
  }

  const lastRound = state.history[state.history.length - 1];

  return (
    <div className="app">
      <GameHeader
        phase={state.phase}
        round={state.round}
        direction={state.direction}
        trump={state.trump}
        onStartOver={handleStartOver}
      />

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
        />
      )}

      {state.phase === "final" && <FinalScreen players={state.players} onStartNew={handleStartNew} />}

      {state.syncIssue && (
        <div className="warn" style={{ marginTop: 12 }}>
          Some data didn&apos;t sync to the cloud — scores on this screen are still correct, but check your
          connection.
        </div>
      )}

      <div className="footer-note">Zilch Scorekeeper</div>
    </div>
  );
}
