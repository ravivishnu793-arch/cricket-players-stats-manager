import { oversToBalls } from "./cricket";

export type BestXICategory = "batsman" | "all-rounder" | "wicketkeeper" | "bowler";

export type BestXIPlayer = {
  id: string;
  name: string;
  role: string;
  runs?: number | null;
  balls_faced?: number | null;
  wickets?: number | null;
  runs_conceded?: number | null;
  overs_bowled?: number | null;
};

export type BestXIGroup = {
  category: BestXICategory;
  label: string;
  required: number;
  players: BestXIPlayer[];
};

export const BEST_XI_ROLES: ReadonlyArray<{ category: BestXICategory; label: string; required: number }> = [
  { category: "batsman", label: "Batsmen", required: 4 },
  { category: "all-rounder", label: "All-Rounders", required: 2 },
  { category: "wicketkeeper", label: "Wicketkeeper", required: 1 },
  { category: "bowler", label: "Bowlers", required: 4 },
];

export const classifyPlayerRole = (role: string): BestXICategory | null => {
  const normalized = role.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized.includes("wicketkeeper") || normalized === "keeper") return "wicketkeeper";
  if (normalized.includes("allrounder")) return "all-rounder";
  if (normalized.includes("batsman") || normalized.includes("batter")) return "batsman";
  if (normalized.includes("bowler")) return "bowler";
  return null;
};

export const bestXIScore = (player: BestXIPlayer, category: BestXICategory): number => {
  const runs = player.runs ?? 0;
  const balls = player.balls_faced ?? 0;
  const strikeRate = balls > 0 ? (runs / balls) * 100 : 0;
  const wickets = player.wickets ?? 0;
  const bowlingBalls = oversToBalls(player.overs_bowled);
  const economy = bowlingBalls > 0 ? ((player.runs_conceded ?? 0) / bowlingBalls) * 6 : 0;

  switch (category) {
    case "batsman":
    case "wicketkeeper":
      return runs + strikeRate * 0.2;
    case "all-rounder":
      return runs + wickets * 20 + strikeRate * 0.1;
    case "bowler":
      return wickets * 25 - (bowlingBalls > 0 ? economy * 2 : 0);
  }
};

export const buildBestXI = (players: BestXIPlayer[]): BestXIGroup[] =>
  BEST_XI_ROLES.map(({ category, label, required }) => {
    const seen = new Set<string>();
    const eligible = players
      .filter((player) => classifyPlayerRole(player.role) === category)
      .filter((player) => {
        if (seen.has(player.id)) return false;
        seen.add(player.id);
        return true;
      })
      .sort((a, b) => bestXIScore(b, category) - bestXIScore(a, category) || a.name.localeCompare(b.name));

    return { category, label, required, players: eligible.slice(0, required) };
  });

export const replaceBestXIPlayer = (
  groups: BestXIGroup[],
  category: BestXICategory,
  currentPlayerId: string | null,
  replacement: BestXIPlayer,
): BestXIGroup[] => {
  const target = groups.find((group) => group.category === category);
  if (!target || classifyPlayerRole(replacement.role) !== category) return groups;
  if (groups.some((group) => group.players.some((player) => player.id === replacement.id && player.id !== currentPlayerId))) {
    return groups;
  }

  return groups.map((group) => {
    if (group.category !== category) return group;
    const currentIndex = currentPlayerId ? group.players.findIndex((player) => player.id === currentPlayerId) : -1;
    if (currentIndex >= 0) {
      const players = [...group.players];
      players[currentIndex] = replacement;
      return { ...group, players };
    }
    if (group.players.length < group.required) return { ...group, players: [...group.players, replacement] };
    return group;
  });
};