import { supabase } from "./supabaseClient";

export type Player = { id: string; name: string };

export type RoundScoreInput = {
  playerId: string;
  bid: number;
  tricksTaken: number;
  points: number;
};

/**
 * Ordered most-recently-played first (nulls, i.e. never-played profiles,
 * sort last) so the setup screen's autocomplete surfaces likely picks first.
 */
export async function fetchAllPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from("player_last_played")
    .select("player_id, name")
    .order("last_played_at", { ascending: false, nullsFirst: false })
    .order("name");
  if (error) throw error;
  return data.map((row) => ({ id: row.player_id!, name: row.name! }));
}

/** Alphabetical listing for the player-management screen (easier to find a specific name than recency order). */
export async function fetchAllPlayersAlphabetical(): Promise<Player[]> {
  const { data, error } = await supabase.from("players").select("id, name").order("name");
  if (error) throw error;
  return data;
}

export async function renamePlayer(playerId: string, newName: string): Promise<void> {
  const { error } = await supabase.from("players").update({ name: newName.trim() }).eq("id", playerId);
  if (error) throw error;
}

/** Fails with a foreign-key error if the player has any game history — by design, callers should catch and explain. */
export async function deletePlayer(playerId: string): Promise<void> {
  const { error } = await supabase.from("players").delete().eq("id", playerId);
  if (error) throw error;
}

/**
 * Looks up a player case-insensitively so "nate" and "Nate" resolve to the
 * same persistent profile instead of creating duplicates. Falls back to
 * re-selecting on a unique-constraint race (two scorekeepers creating the
 * same new name at once) rather than erroring out mid-setup.
 */
export async function findOrCreatePlayer(name: string): Promise<Player> {
  const trimmed = name.trim();
  const { data: existing, error: findError } = await supabase
    .from("players")
    .select("id, name")
    .ilike("name", trimmed)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from("players")
    .insert({ name: trimmed })
    .select("id, name")
    .single();

  if (insertError) {
    const { data: retry, error: retryError } = await supabase
      .from("players")
      .select("id, name")
      .ilike("name", trimmed)
      .maybeSingle();
    if (retry) return retry;
    throw retryError ?? insertError;
  }

  return created;
}

export async function createGame(
  maxCards: number,
  seatedPlayers: { playerId: string; seatOrder: number }[],
): Promise<string> {
  const { data: game, error: gameError } = await supabase
    .from("games")
    .insert({ max_cards: maxCards })
    .select("id")
    .single();
  if (gameError) throw gameError;

  const { error: playersError } = await supabase.from("game_players").insert(
    seatedPlayers.map((p) => ({
      game_id: game.id,
      player_id: p.playerId,
      seat_order: p.seatOrder,
    })),
  );
  if (playersError) throw playersError;

  return game.id;
}

/** Removes a game abandoned before any round was recorded (e.g. via Start Over). */
export async function deleteEmptyGame(gameId: string): Promise<void> {
  const { error } = await supabase.from("games").delete().eq("id", gameId);
  if (error) throw error;
}

export async function saveRoundResult(
  gameId: string,
  roundNumber: number,
  cardCount: number,
  trumpSuit: string | null,
  scores: RoundScoreInput[],
): Promise<string> {
  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .insert({ game_id: gameId, round_number: roundNumber, card_count: cardCount, trump_suit: trumpSuit })
    .select("id")
    .single();
  if (roundError) throw roundError;

  const { error: scoresError } = await supabase.from("round_scores").insert(
    scores.map((s) => ({
      round_id: round.id,
      player_id: s.playerId,
      bid: s.bid,
      tricks_taken: s.tricksTaken,
      points: s.points,
    })),
  );
  if (scoresError) throw scoresError;

  return round.id;
}

/**
 * Overwrites an already-synced round in place (used by "Edit This Round").
 * Keeps the same round id rather than delete-then-reinsert, so a save that
 * fails partway never leaves the round missing from the game's history.
 */
export async function updateRoundResult(
  roundId: string,
  trumpSuit: string | null,
  scores: RoundScoreInput[],
): Promise<void> {
  const { error: roundError } = await supabase.from("rounds").update({ trump_suit: trumpSuit }).eq("id", roundId);
  if (roundError) throw roundError;

  const { error: scoresError } = await supabase.from("round_scores").upsert(
    scores.map((s) => ({
      round_id: roundId,
      player_id: s.playerId,
      bid: s.bid,
      tricks_taken: s.tricksTaken,
      points: s.points,
    })),
    { onConflict: "round_id,player_id" },
  );
  if (scoresError) throw scoresError;
}

export async function finalizeGame(
  gameId: string,
  winnerId: string,
  finalTotals: { playerId: string; total: number }[],
): Promise<void> {
  const { error: gameError } = await supabase
    .from("games")
    .update({ ended_at: new Date().toISOString(), winner_id: winnerId })
    .eq("id", gameId);
  if (gameError) throw gameError;

  await Promise.all(
    finalTotals.map(({ playerId, total }) =>
      supabase
        .from("game_players")
        .update({ final_total: total })
        .eq("game_id", gameId)
        .eq("player_id", playerId),
    ),
  );
}

export type LeaderboardRow = {
  playerId: string;
  name: string;
  gamesPlayed: number;
  wins: number;
  roundsPlayed: number;
  bidsHit: number;
};

export async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from("leaderboard")
    .select("player_id, name, games_played, wins, rounds_played, bids_hit")
    .order("wins", { ascending: false })
    .order("games_played", { ascending: false })
    .order("name");
  if (error) throw error;
  return data
    .filter((row) => row.games_played && row.games_played > 0)
    .map((row) => ({
      playerId: row.player_id!,
      name: row.name!,
      gamesPlayed: row.games_played!,
      wins: row.wins ?? 0,
      roundsPlayed: row.rounds_played ?? 0,
      bidsHit: row.bids_hit ?? 0,
    }));
}

export type PlayerStats = {
  playerId: string;
  avgBid: number;
  avgPoints: number;
  bestRound: number;
  accuracyPct: number;
  /** Cumulative bid-accuracy % after each round played, in chronological order. */
  accuracyTrend: number[];
};

/**
 * One row per round ever scored, across every game, in chronological order —
 * grouped client-side per player rather than via a dedicated view, since this
 * is a read-only rollup with no other consumer.
 */
export async function fetchPlayerStats(): Promise<Map<string, PlayerStats>> {
  const { data, error } = await supabase
    .from("round_scores")
    .select("player_id, bid, tricks_taken, points, rounds(created_at)")
    .order("created_at", { referencedTable: "rounds" });
  if (error) throw error;

  const totals = new Map<string, { bidSum: number; pointsSum: number; best: number; hits: number; count: number; trend: number[] }>();
  for (const row of data) {
    const t = totals.get(row.player_id) ?? { bidSum: 0, pointsSum: 0, best: 0, hits: 0, count: 0, trend: [] };
    t.bidSum += row.bid;
    t.pointsSum += row.points;
    t.best = Math.max(t.best, row.points);
    t.count += 1;
    if (row.tricks_taken === row.bid) t.hits += 1;
    t.trend.push((t.hits / t.count) * 100);
    totals.set(row.player_id, t);
  }

  const result = new Map<string, PlayerStats>();
  for (const [playerId, t] of totals) {
    result.set(playerId, {
      playerId,
      avgBid: t.bidSum / t.count,
      avgPoints: t.pointsSum / t.count,
      bestRound: t.best,
      accuracyPct: (t.hits / t.count) * 100,
      accuracyTrend: t.trend,
    });
  }
  return result;
}

export type RecentGame = {
  id: string;
  endedAt: string;
  maxCards: number;
  winnerName: string | null;
  standings: { name: string; finalTotal: number }[];
};

export async function fetchRecentGames(limit = 10): Promise<RecentGame[]> {
  const { data, error } = await supabase
    .from("games")
    .select(
      "id, ended_at, max_cards, winner:players!games_winner_id_fkey(name), game_players(final_total, players(name))",
    )
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return data.map((g) => ({
    id: g.id,
    endedAt: g.ended_at!,
    maxCards: g.max_cards,
    winnerName: g.winner?.name ?? null,
    standings: g.game_players
      .map((gp) => ({ name: gp.players?.name ?? "Unknown", finalTotal: gp.final_total }))
      .sort((a, b) => b.finalTotal - a.finalTotal),
  }));
}
