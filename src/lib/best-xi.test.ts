import { BEST_XI_ROLES, buildBestXI, classifyPlayerRole, replaceBestXIPlayer } from "./best-xi";

let failed = 0;
const check = (name: string, actual: unknown, expected: unknown) => {
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  if (passed) console.log(`PASS ${name}`);
  else {
    failed++;
    console.error(`FAIL ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

const players = [
  ...Array.from({ length: 5 }, (_, index) => ({ id: `bat-${index + 1}`, name: `Batter ${index + 1}`, role: "Batsman", runs: 100 - index, balls_faced: 50 })),
  ...Array.from({ length: 3 }, (_, index) => ({ id: `all-${index + 1}`, name: `All Rounder ${index + 1}`, role: "All-Rounder", runs: 40 - index, wickets: 3 - index })),
  { id: "keeper-1", name: "Keeper", role: "Wicket Keeper", runs: 55, balls_faced: 40 },
  ...Array.from({ length: 5 }, (_, index) => ({ id: `bowl-${index + 1}`, name: `Bowler ${index + 1}`, role: "Bowler", wickets: 5 - index, runs_conceded: 20, overs_bowled: 4 })),
];

check("role plan requires 4 batsmen, 2 all-rounders, 1 wicketkeeper, 4 bowlers", BEST_XI_ROLES.map((role) => role.required), [4, 2, 1, 4]);
check("recognizes wicketkeeper role variants", [classifyPlayerRole("Wicket Keeper"), classifyPlayerRole("Wicketkeeper")], ["wicketkeeper", "wicketkeeper"]);

const lineup = buildBestXI(players);
check("fills the XI from the highest ranked players in each role", lineup.map((group) => group.players.map((player) => player.id)), [
  ["bat-1", "bat-2", "bat-3", "bat-4"],
  ["all-1", "all-2"],
  ["keeper-1"],
  ["bowl-1", "bowl-2", "bowl-3", "bowl-4"],
]);
check("selects eleven distinct players", new Set(lineup.flatMap((group) => group.players.map((player) => player.id))).size, 11);

const shortRoster = buildBestXI([{ id: "only-bat", name: "Only Batter", role: "Batsman", runs: 10 }]);
check("leaves unfilled roles empty when the roster is short", shortRoster.map((group) => group.players.length), [1, 0, 0, 0]);

const swappedLineup = replaceBestXIPlayer(lineup, "batsman", "bat-1", {
  id: "bat-5", name: "Batter 5", role: "Batsman", runs: 96, balls_faced: 50,
});
check("allows manual replacement within a role", swappedLineup[0].players.map((player) => player.id), ["bat-5", "bat-2", "bat-3", "bat-4"]);
const duplicateSwap = replaceBestXIPlayer(lineup, "batsman", "bat-1", lineup[1].players[0]);
check("prevents selecting one player in multiple roles", duplicateSwap[0].players.map((player) => player.id), lineup[0].players.map((player) => player.id));

if (failed > 0) throw new Error(`${failed} Best XI check(s) failed`);
console.log("All Best XI checks passed");