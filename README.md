# Zilch Scorekeeper

A digital scorekeeper for **Zilch**, a bidding trick-taking card game played with a standard 52-card deck. One person (the scorekeeper) runs this on their phone during an in-person card game — it's a replacement for pen-and-paper scoring, not a multiplayer-sync app.

Live at **[zilch-gold.vercel.app](https://zilch-gold.vercel.app)**. Works best installed via Safari's "Add to Home Screen" for a full-screen, app-like experience.

## Game rules

- Round 1 deals 1 card per player; each round after that deals one more, up to `floor(52 / players)`, then counts back down to 1 and the game ends.
- Before play, everyone bids how many tricks they'll take that round.
- Scoring per round: `tricks_taken + (10 bonus if tricks_taken === bid exactly)`.
- The scorekeeper can head back down early or end the game at any point.
- Highest cumulative score when the game ends wins.

## Stack

- **Next.js 15** (App Router, TypeScript) — client-rendered screens, no backend of its own
- **Supabase** (Postgres) — `players`, `games`, `game_players`, `rounds`, `round_scores` tables, plus `leaderboard` / `player_last_played` views for aggregate queries
- **Vercel** — hosting, auto-deploys on push to `main`

No authentication: the scorekeeper picks player names from a list (or adds new ones) at game setup. This is intentional — see [Identity & security](#identity--security) below.

## Local development

```bash
npm install
npm run dev
```

Requires a `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=https://hkqajjcuebquuatemujj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key from Supabase project settings>
```

The dev server and production deploy point at the **same** Supabase project — there's no separate dev/staging database. Test data should be cleaned up via the Supabase dashboard (Table Editor or SQL Editor) after manual testing; delete from `games` before `players` since only `games` cascades.

## Identity & security

Row Level Security is permissive: the `anon` role has full read/write access to all tables. There's no login, matching how the game is actually played (one phone, passed around, no accounts). This means anyone with the URL could read or write data — acceptable for casual/family use with an unlisted link, not suitable if the URL is ever made public. Free-tier billing on both Vercel and Supabase is structured so this can't turn into a surprise bill (limits pause/restrict service rather than charging overages), so the realistic risk is data mischief, not cost.

## Project layout

```
src/app/            routes (/, /leaderboard) + PWA manifest/icons
src/components/      screen components (Setup, Bid, Tricks, RoundComplete, Final)
src/lib/             game logic, Supabase client, DB read/write helpers, generated types
prototype/           original single-file HTML prototype this app was ported from
```
