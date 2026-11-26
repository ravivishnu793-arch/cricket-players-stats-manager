// Cricket calculations. Overs use cricket notation: 7.5 = 7 overs + 5 balls = 47 balls (never 7.5 × 6).

export const oversToBalls = (overs: number | string | null | undefined): number => {
  if (overs === null || overs === undefined || overs === "") return 0;
  const [o, b = "0"] = String(overs).trim().split(".");
  const whole = parseInt(o || "0", 10) || 0;
  const balls = parseInt(b.slice(0, 1) || "0", 10) || 0;
  return whole * 6 + Math.min(balls, 5);
};

export const ballsToOvers = (balls: number): string => `${Math.floor(balls / 6)}.${balls % 6}`;

export const isValidOvers = (overs: string | number): boolean => /^\d+(\.[0-5])?$/.test(String(overs).trim());

export const strikeRate = (runs: number, balls: number): number | null =>
  balls > 0 ? Math.round((runs / balls) * 10000) / 100 : null;

export const economy = (runsConceded: number, balls: number): number | null =>
  balls > 0 ? Math.round((runsConceded / balls) * 6 * 100) / 100 : null;

export const normalizeName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const levenshtein = (a: string, b: string) => {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};

/** Similarity 0-100 between an OCR name and a stored name (exact, initials, partial, fuzzy). */
export const nameSimilarity = (ocr: string, stored: string): number => {
  const a = normalizeName(ocr), b = normalizeName(stored);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.replace(/ /g, "") === b.replace(/ /g, "")) return 98;
  const at = a.split(" "), bt = b.split(" ");
  // Initial matching: "Ravi K" ~ "Ravi Krishna", "R Krishna" ~ "Ravi Krishna"
  if (at.length === bt.length && at.length > 1) {
    const ok = at.every((t, i) => t === bt[i] || (t.length === 1 && bt[i].startsWith(t)) || (bt[i].length === 1 && t.startsWith(bt[i])));
    if (ok) return 94;
  }
  if (at.length === 1 && bt[0] === at[0]) return 85;
  if (b.startsWith(a) || a.startsWith(b)) return 88;
  const fuzzy = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  const firstTok = 1 - levenshtein(at[0], bt[0]) / Math.max(at[0].length, bt[0].length);
  return Math.round(Math.max(fuzzy, firstTok * 0.85) * 100);
};

export type MatchCandidate = { id: string; name: string; score: number; viaAlias?: boolean };

export const bestMatch = (
  ocr: string,
  items: { id: string; name: string }[],
  aliases: { player_id: string; alias_normalized: string }[] = [],
): MatchCandidate | null => {
  const n = normalizeName(ocr);
  const alias = aliases.find((a) => a.alias_normalized === n);
  if (alias) {
    const p = items.find((i) => i.id === alias.player_id);
    if (p) return { id: p.id, name: p.name, score: 100, viaAlias: true };
  }
  let best: MatchCandidate | null = null;
  for (const i of items) {
    const s = nameSimilarity(ocr, i.name);
    if (!best || s > best.score) best = { id: i.id, name: i.name, score: s };
  }
  return best;
};

export const confidenceLevel = (score: number): "high" | "medium" | "low" =>
  score >= 90 ? "high" : score >= 70 ? "medium" : "low";

export type FormTone = "great" | "good" | "ok" | "quiet";

/** Recent-form rating for a single match from batting and bowling lines. */
export const formOutcome = (
  bat?: { runs: number } | null,
  bowl?: { wickets: number } | null,
): FormTone => {
  const runs = bat?.runs ?? 0;
  const wkts = bowl?.wickets ?? 0;
  if (runs >= 50 || wkts >= 3) return "great";
  if (runs >= 25 || wkts >= 2) return "good";
  if (runs > 0 || wkts > 0) return "ok";
  return "quiet";
};

export type FormEntry = {
  match_id: string;
  date: string;
  runs?: number;
  balls?: number;
  not_out?: boolean;
  wickets?: number;
  conceded?: number;
  bowl_balls?: number;
};

/** Merge batting/bowling rows into chronological entries, newest first, capped at `limit`. */
export const buildFormGuide = (
  bat: { match_id: string; runs: number; balls: number; not_out: boolean; matches?: { match_date: string } | null }[],
  bowl: { match_id: string; wickets: number; runs: number; balls: number; matches?: { match_date: string } | null }[],
  limit = 5,
): FormEntry[] => {
  const map = new Map<string, FormEntry>();
  bat.forEach((r) => {
    map.set(r.match_id, {
      match_id: r.match_id,
      date: r.matches?.match_date ?? "",
      runs: r.runs,
      balls: r.balls,
      not_out: r.not_out,
    });
  });
  bowl.forEach((r) => {
    const existing = map.get(r.match_id);
    map.set(r.match_id, {
      match_id: r.match_id,
      date: r.matches?.match_date ?? existing?.date ?? "",
      runs: existing?.runs,
      balls: existing?.balls,
      not_out: existing?.not_out,
      wickets: r.wickets,
      conceded: r.runs,
      bowl_balls: r.balls,
    });
  });
  return [...map.values()]
    .filter((e) => e.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
};

/** Player of the Match impact score: 1 pt per run, 25 per wicket, +10 for a 50+, +25 for a 100+. */
export const impactScore = (bat?: { runs: number } | null, bowl?: { wickets: number } | null): number => {
  const runs = bat?.runs ?? 0;
  const wkts = bowl?.wickets ?? 0;
  return runs + wkts * 25 + (runs >= 100 ? 25 : runs >= 50 ? 10 : 0);
};
