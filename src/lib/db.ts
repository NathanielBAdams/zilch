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

export async function saveRoundResult(
  gameId: string,
  roundNumber: number,
  cardCount: number,
  trumpSuit: string | null,
  scores: RoundScoreInput[],
): Promise<void> {
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
