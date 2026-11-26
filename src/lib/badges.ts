// Hall of Fame badge engine. Pure rules, no data fetching.
import { oversToBalls } from "./cricket";

export type PlayerBadgeId = "century" | "strike-king" | "wicket-magnet" | "fifer" | "economy-master";

export type PlayerBadge = {
  id: PlayerBadgeId;
  emoji: string;
  label: string;
  hint: string;
};

const BADGE_INFO: Record<PlayerBadgeId, Omit<PlayerBadge, "id">> = {
  century: { emoji: "🏏", label: "Century Club", hint: "100+ career runs" },
  "strike-king": { emoji: "🔥", label: "Strike King", hint: "Strike rate 150+ (min 10 balls)" },
  "wicket-magnet": { emoji: "🎯", label: "Wicket Magnet", hint: "5+ career wickets" },
  fifer: { emoji: "🌟", label: "Fifer", hint: "5 wickets in one match" },
  "economy-master": { emoji: "🛡️", label: "Economy Master", hint: "Economy under 6.0 (min 6 overs)" },
};

/**
 * Career badges from batting/bowling career stats, plus match-level badges
 * (Fifer) from per-match scorecard rows when available.
 */
export const computeBadges = (
  batting?: { runs: number; balls_faced: number } | null,
  bowling?: { wickets: number; runs_conceded: number; overs_bowled: number } | null,
  matchBatting: { runs: number }[] = [],
  matchBowling: { wickets: number }[] = [],
): PlayerBadge[] => {
  const ids: PlayerBadgeId[] = [];

  const runs = batting?.runs ?? 0;
  const balls = batting?.balls_faced ?? 0;
  if (runs >= 100) ids.push("century");
  if (balls >= 10 && (runs / balls) * 100 >= 150) ids.push("strike-king");

  const wickets = bowling?.wickets ?? 0;
  if (wickets >= 5) ids.push("wicket-magnet");
  if (matchBowling.some((m) => m.wickets >= 5)) ids.push("fifer");

  const bowlBalls = oversToBalls(bowling?.overs_bowled);
  if (bowlBalls >= 36 && bowling && bowling.runs_conceded / bowlBalls * 6 < 6.0) ids.push("economy-master");

  return ids.map((id) => ({ id, ...BADGE_INFO[id] }));
};
