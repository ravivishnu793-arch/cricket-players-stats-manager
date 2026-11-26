// Cricket AI Analyst — read-only. Uses the public (anon) key so it can only READ public stats.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createOpenAI } from "npm:@ai-sdk/openai@4";
import { streamText, convertToModelMessages, tool, jsonSchema, stepCountIs, type UIMessage } from "npm:ai@7";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "../_shared/run-id.ts";

const cors = { ...corsHeaders, "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID" };
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const oversToBalls = (o: number | null) => {
  const v = Number(o ?? 0);
  const whole = Math.floor(v);
  return whole * 6 + Math.round((v - whole) * 10);
};
const ballsToOvers = (b: number) => `${Math.floor(b / 6)}.${b % 6}`;
const r2 = (n: number | null) => (n == null || !isFinite(n) ? null : Math.round(n * 100) / 100);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function lev(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// deno-lint-ignore no-explicit-any
type Row = any;

async function loadAll(db: ReturnType<typeof createClient>) {
  const [players, bat, bowl, tp, teams, aliases, mf] = await Promise.all([
    db.from("players").select("id,name,role,matches_played"),
    db.from("batting_stats").select("*"),
    db.from("bowling_stats").select("*"),
    db.from("team_players").select("player_id,team_id"),
    db.from("teams").select("id,name,matches_played,wins,losses,win_percentage,captain_id"),
    db.from("player_aliases").select("player_id,alias_normalized"),
    db.from("match_fielding").select("player_id,catches,run_outs,stumpings"),
  ]);
  const err = [players, bat, bowl, tp, teams, aliases, mf].find((r) => r.error);
  if (err) throw new Error("Database query failed");
  const teamName = new Map((teams.data as Row[]).map((t) => [t.id, t.name]));
  const career = (players.data as Row[]).map((p) => {
    const b = (bat.data as Row[]).find((x) => x.player_id === p.id) ?? {};
    const w = (bowl.data as Row[]).find((x) => x.player_id === p.id) ?? {};
    const f = (mf.data as Row[]).filter((x) => x.player_id === p.id);
    const innings = b.innings ?? 0, notOuts = b.not_outs ?? 0, runs = b.runs ?? 0, bf = b.balls_faced ?? 0;
    const balls = oversToBalls(w.overs_bowled);
    const outs = innings - notOuts;
    return {
      id: p.id, name: p.name, role: p.role,
      team: teamName.get((tp.data as Row[]).find((x) => x.player_id === p.id)?.team_id) ?? null,
      matches: p.matches_played ?? 0,
      innings, runs, not_outs: notOuts, highest_score: b.highest_score ?? 0, fours: b.fours ?? 0, sixes: b.sixes ?? 0,
      balls_faced: bf || null,
      batting_average: outs > 0 ? r2(runs / outs) : null,
      strike_rate: bf > 0 ? r2((runs / bf) * 100) : null,
      wickets: w.wickets ?? 0, overs_bowled: ballsToOvers(balls), runs_conceded: w.runs_conceded ?? 0,
      economy: balls > 0 ? r2(((w.runs_conceded ?? 0) / balls) * 6) : null,
      bowling_average: (w.wickets ?? 0) > 0 ? r2((w.runs_conceded ?? 0) / w.wickets) : null,
      best_bowling: w.best_bowling ?? null,
      catches: f.reduce((s, x) => s + x.catches, 0), run_outs: f.reduce((s, x) => s + x.run_outs, 0),
      stumpings: f.reduce((s, x) => s + x.stumpings, 0),
    };
  });
  return { career, teams: teams.data as Row[], aliases: aliases.data as Row[], teamName };
}

function resolvePlayer(name: string, career: Row[], aliases: Row[]) {
  const q = norm(name);
  const alias = aliases.find((a) => a.alias_normalized === q);
  if (alias) return career.find((c) => c.id === alias.player_id) ?? null;
  let best: Row = null, bestScore = 0;
  for (const c of career) {
    const n = norm(c.name);
    let s = 0;
    if (n === q) s = 1;
    else if (n.split(" ").some((t) => t === q) || n.startsWith(q + " ")) s = 0.9;
    else if (n.includes(q) || q.includes(n)) s = 0.8;
    else s = 1 - lev(n, q) / Math.max(n.length, q.length);
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return bestScore >= 0.6 ? best : null;
}

async function recentMatches(db: ReturnType<typeof createClient>, teamName: Map<string, string>, playerId: string | null, limit: number) {
  if (playerId) {
    const [bat, bowl] = await Promise.all([
      db.from("match_batting").select("match_id,runs,balls,fours,sixes,not_out,dismissal,matches(match_date,title,format,overs_limit)").eq("player_id", playerId),
      db.from("match_bowling").select("match_id,balls,runs,wickets,matches(match_date,title,format,overs_limit)").eq("player_id", playerId),
    ]);
    const byMatch = new Map<string, Row>();
    for (const b of (bat.data ?? []) as Row[]) byMatch.set(b.match_id, { date: b.matches?.match_date, title: b.matches?.title, overs: b.matches?.overs_limit, batting: `${b.runs}${b.not_out ? "*" : ""} (${b.balls})`, fours: b.fours, sixes: b.sixes });
    for (const w of (bowl.data ?? []) as Row[]) {
      const m = byMatch.get(w.match_id) ?? { date: w.matches?.match_date, title: w.matches?.title, overs: w.matches?.overs_limit };
      m.bowling = `${w.wickets}/${w.runs} (${ballsToOvers(w.balls)} ov)`;
      byMatch.set(w.match_id, m);
    }
    return [...byMatch.values()].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, limit);
  }
  const { data } = await db.from("matches").select("*").order("match_date", { ascending: false }).limit(limit);
  return ((data ?? []) as Row[]).map((m) => ({
    date: m.match_date, title: m.title, venue: m.venue, format: m.format, overs: m.overs_limit,
    team1: teamName.get(m.team1_id) ?? null, team1_score: m.team1_runs != null ? `${m.team1_runs}/${m.team1_wickets ?? "?"} (${ballsToOvers(m.team1_balls ?? 0)})` : null,
    team2: teamName.get(m.team2_id) ?? null, team2_score: m.team2_runs != null ? `${m.team2_runs}/${m.team2_wickets ?? "?"} (${ballsToOvers(m.team2_balls ?? 0)})` : null,
    winner: teamName.get(m.winner_id) ?? null, result: m.result,
  }));
}

async function formLeaderboard(db: ReturnType<typeof createClient>, overs: number, metric: string, limit: number) {
  const { data: ms } = await db.from("matches").select("id").eq("overs_limit", overs);
  const ids = ((ms ?? []) as Row[]).map((m) => m.id);
  if (!ids.length) return { note: `No ${overs}-over matches have been imported into CricketIQ yet.`, rows: [] };
  const [bat, bowl, pl] = await Promise.all([
    db.from("match_batting").select("player_id,runs,balls,not_out").in("match_id", ids),
    db.from("match_bowling").select("player_id,balls,runs,wickets").in("match_id", ids),
    db.from("players").select("id,name"),
  ]);
  const agg = new Map<string, Row>();
  const g = (id: string) => agg.get(id) ?? (agg.set(id, { runs: 0, balls: 0, outs: 0, wickets: 0, bb: 0, rc: 0 }), agg.get(id));
  for (const b of (bat.data ?? []) as Row[]) { const a = g(b.player_id); a.runs += b.runs; a.balls += b.balls; if (!b.not_out) a.outs++; }
  for (const w of (bowl.data ?? []) as Row[]) { const a = g(w.player_id); a.wickets += w.wickets; a.bb += w.balls; a.rc += w.runs; }
  const name = new Map(((pl.data ?? []) as Row[]).map((p) => [p.id, p.name]));
  const rows = [...agg.entries()].map(([id, a]) => ({
    name: name.get(id), runs: a.runs, strike_rate: a.balls ? r2(a.runs / a.balls * 100) : null,
    wickets: a.wickets, economy: a.bb ? r2(a.rc / a.bb * 6) : null,
  }));
  const key = ["runs", "wickets", "strike_rate", "economy"].includes(metric) ? metric : "runs";
  rows.sort((x: Row, y: Row) => key === "economy" ? (x.economy ?? 99) - (y.economy ?? 99) : (y[key] ?? -1) - (x[key] ?? -1));
  return { matches: ids.length, rows: rows.slice(0, limit) };
}

const SYSTEM = `You are the CricketIQ Cricket AI Analyst. Answer ONLY using data returned by your tools. Never invent or estimate statistics.
If a tool returns null or the data is missing, say: "That statistic is not available in CricketIQ."
Always call a tool before answering any question about players, teams or matches.
Synonyms: "top batsman/best batter/highest run scorer/most runs" -> leaderboard metric runs. "best bowler/most wickets" -> wickets. "lowest economy/best economy" -> economy (lower is better).
Overs use cricket notation: 7.5 overs = 7 overs and 5 balls (47 balls).
Style: concise. Start with a one-sentence direct answer, then optionally a few key numbers as a short list. For comparisons use a markdown table. Do not mention tools, databases or SQL.
You are read-only: if asked to change, add or delete data, explain that only admins can edit stats in the Admin panel.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI is not configured." }, 500);

  let messages: UIMessage[];
  try {
    const body = await req.json();
    if (!Array.isArray(body?.messages) || body.messages.length === 0 || body.messages.length > 60) throw new Error();
    messages = body.messages;
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  // Public read-only client (anon key) — cannot write thanks to RLS.
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
  let cache: Awaited<ReturnType<typeof loadAll>> | null = null;
  const data = async () => (cache ??= await loadAll(db));

  const nullableStr = { type: ["string", "null"] };
  const tools = {
    leaderboard: tool({
      description: "Rank players by a career statistic. Use for top/best/most questions.",
      inputSchema: jsonSchema<{ metric: string; limit: number | null; min_balls: number | null; min_runs: number | null }>({
        type: "object", additionalProperties: false, required: ["metric", "limit", "min_balls", "min_runs"],
        properties: {
          metric: { type: "string", enum: ["runs", "wickets", "batting_average", "strike_rate", "economy", "bowling_average", "sixes", "fours", "highest_score", "best_bowling", "catches", "matches"] },
          limit: { type: ["integer", "null"], description: "How many players (default 5)" },
          min_balls: { type: ["integer", "null"], description: "Minimum balls faced (for strike rate) or bowled (for economy)" },
          min_runs: { type: ["integer", "null"], description: "Only include players with at least this many runs" },
        },
      }),
      execute: async ({ metric, limit, min_balls, min_runs }) => {
        const { career } = await data();
        let rows = career.filter((c) => (min_runs == null || c.runs >= min_runs));
        if (metric === "strike_rate") rows = rows.filter((c) => c.strike_rate != null && (c.balls_faced ?? 0) >= (min_balls ?? 1));
        if (metric === "economy" || metric === "bowling_average") rows = rows.filter((c) => c[metric] != null && oversToBalls(Number(c.overs_bowled)) >= (min_balls ?? 1));
        if (metric === "batting_average") rows = rows.filter((c) => c.batting_average != null);
        const bbKey = (s: string | null) => { if (!s) return -1; const [w, r] = s.split("/").map(Number); return w * 1000 - r; };
        rows.sort((a, b) => metric === "best_bowling" ? bbKey(b.best_bowling) - bbKey(a.best_bowling)
          : metric === "economy" || metric === "bowling_average" ? a[metric] - b[metric] : (b[metric] ?? 0) - (a[metric] ?? 0));
        const keep = ["name", "team", "matches", "runs", "batting_average", "strike_rate", "wickets", "economy", metric];
        return { metric, rows: rows.slice(0, Math.min(limit ?? 5, 20)).map((r) => Object.fromEntries(keep.map((k) => [k, r[k]]))) };
      },
    }),
    player_profile: tool({
      description: "Full career profile and recent matches for one player (fuzzy name match).",
      inputSchema: jsonSchema<{ name: string; recent: number | null }>({
        type: "object", additionalProperties: false, required: ["name", "recent"],
        properties: { name: { type: "string" }, recent: { type: ["integer", "null"], description: "Number of recent matches (default 5)" } },
      }),
      execute: async ({ name, recent }) => {
        const { career, aliases, teamName } = await data();
        const p = resolvePlayer(name, career, aliases);
        if (!p) return { error: `No player named "${name}" found in CricketIQ.`, players: career.map((c) => c.name) };
        const matches = await recentMatches(db, teamName, p.id, Math.min(recent ?? 5, 20));
        return { ...p, id: undefined, recent_matches: matches, recent_matches_note: matches.length ? null : "No match-by-match scorecards imported for this player yet." };
      },
    }),
    compare_players: tool({
      description: "Compare career stats of two or more players side by side.",
      inputSchema: jsonSchema<{ names: string[] }>({
        type: "object", additionalProperties: false, required: ["names"],
        properties: { names: { type: "array", items: { type: "string" } } },
      }),
      execute: async ({ names }) => {
        const { career, aliases } = await data();
        return { players: names.slice(0, 4).map((n) => { const p = resolvePlayer(n, career, aliases); return p ? { ...p, id: undefined } : { name: n, error: "Not found" }; }) };
      },
    }),
    recent_matches: tool({
      description: "Latest match results, optionally for one player (their last N matches).",
      inputSchema: jsonSchema<{ player: string | null; limit: number | null }>({
        type: "object", additionalProperties: false, required: ["player", "limit"],
        properties: { player: nullableStr, limit: { type: ["integer", "null"] } },
      }),
      execute: async ({ player, limit }) => {
        const { career, aliases, teamName } = await data();
        let pid: string | null = null;
        if (player) { const p = resolvePlayer(player, career, aliases); if (!p) return { error: `No player named "${player}"` }; pid = p.id; }
        const rows = await recentMatches(db, teamName, pid, Math.min(limit ?? 5, 20));
        return { matches: rows, note: rows.length ? null : "No match scorecards have been imported yet." };
      },
    }),
    format_leaderboard: tool({
      description: "Rank players within one match format (e.g. 6-over or 8-over matches), from imported scorecards.",
      inputSchema: jsonSchema<{ overs: number; metric: string; limit: number | null }>({
        type: "object", additionalProperties: false, required: ["overs", "metric", "limit"],
        properties: { overs: { type: "integer" }, metric: { type: "string", enum: ["runs", "wickets", "strike_rate", "economy"] }, limit: { type: ["integer", "null"] } },
      }),
      execute: async ({ overs, metric, limit }) => formLeaderboard(db, overs, metric, Math.min(limit ?? 5, 20)),
    }),
    team_stats: tool({
      description: "Team records: matches, wins, losses, win %, captain and squad.",
      inputSchema: jsonSchema<{ team: string | null }>({
        type: "object", additionalProperties: false, required: ["team"], properties: { team: nullableStr },
      }),
      execute: async ({ team }) => {
        const { teams, career } = await data();
        const list = team ? teams.filter((t) => norm(t.name).includes(norm(team))) : teams;
        return { teams: list.map((t) => ({ name: t.name, matches: t.matches_played, wins: t.wins, losses: t.losses, win_percentage: t.win_percentage,
          captain: career.find((c) => c.id === t.captain_id)?.name ?? null, squad: career.filter((c) => c.team === t.name).map((c) => c.name) })) };
      },
    }),
  };

  try {
    const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system: SYSTEM,
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(50),
      abortSignal: req.signal,
      providerOptions: {
        openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
      },
    });
    return await withLovableAiGatewayRunIdHeader(
      result.toUIMessageStreamResponse({
        originalMessages: messages,
        sendReasoning: true,
        onError: (e: unknown) => {
          const s = (e as { statusCode?: number })?.statusCode;
          if (s === 429) return "The AI Analyst is busy right now. Please try again in a moment.";
          if (s === 402) return "AI credits have run out. Please add credits to keep using the AI Analyst.";
          console.error("analyst error", e);
          return "Sorry, something went wrong answering that. Please try again.";
        },
      }),
      runIdFetch,
      cors,
    );
  } catch (e) {
    console.error(e);
    return json({ error: "The AI Analyst is unavailable right now." }, 500);
  }
});
