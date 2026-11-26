// Self-contained checks for the badge rules. Run: bun src/lib/badges.test.ts
import { computeBadges } from "./badges";

let failed = 0;
const check = (name: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failed++;
    console.error(`FAIL ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  } else {
    console.log(`PASS ${name}`);
  }
};

const ids = (batting?: any, bowling?: any, mb: any[] = [], mwb: any[] = []) =>
  computeBadges(batting, bowling, mb, mwb).map((b) => b.id);

// Century Club: 100+ career runs
check("99 runs no century badge", ids({ runs: 99, balls_faced: 80 }), []);
check("100 runs gives century badge", ids({ runs: 100, balls_faced: 80 }), ["century"]);

// Strike King: SR >= 150 with at least 10 balls faced
check("9 balls never strike king", ids({ runs: 20, balls_faced: 9 }), []);
check("150 SR gives strike king", ids({ runs: 30, balls_faced: 20 }), ["strike-king"]);
check("149 SR is not strike king", ids({ runs: 29, balls_faced: 20 }), []);
check("high SR with no balls faced is ignored", ids({ runs: 30, balls_faced: 0 }), []);

// Wicket Magnet: 5+ career wickets
check("4 wickets no badge", ids(null, { wickets: 4, runs_conceded: 30, overs_bowled: 3 }), []);
check("5 wickets gives wicket magnet", ids(null, { wickets: 5, runs_conceded: 30, overs_bowled: 3 }), ["wicket-magnet"]);

// Fifer: 5 wickets in a single match row
check("no fifer from career only", ids(null, { wickets: 6, runs_conceded: 30, overs_bowled: 3 }), ["wicket-magnet"]);
check("fifer from match row", ids(null, { wickets: 4, runs_conceded: 30, overs_bowled: 3 }, [], [{ wickets: 5 }]), ["fifer"]);
check("4-wicket match is not a fifer", ids(null, { wickets: 4, runs_conceded: 30, overs_bowled: 3 }, [], [{ wickets: 4 }]), []);

// Economy Master: economy < 6.0 with at least 6 overs (overs 5.5 = 35 balls, not enough)
check("5.5 overs never economy master", ids(null, { wickets: 0, runs_conceded: 30, overs_bowled: 5.5 }), []);
check("6 overs at 5.0 econ gives badge", ids(null, { wickets: 0, runs_conceded: 30, overs_bowled: 6 }), ["economy-master"]);
check("exactly 6.0 econ no badge", ids(null, { wickets: 0, runs_conceded: 36, overs_bowled: 6 }), []);
check("6 overs at 6.5 econ no badge", ids(null, { wickets: 0, runs_conceded: 39, overs_bowled: 6 }), []);

// Combined
check(
  "all-round star gets all badges",
  ids({ runs: 150, balls_faced: 80 }, { wickets: 6, runs_conceded: 30, overs_bowled: 6 }, [], [{ wickets: 5 }]),
  ["century", "strike-king", "wicket-magnet", "fifer", "economy-master"],
);

if (failed > 0) {
  console.error(`${failed} check(s) failed`);
  throw new Error("badge checks failed");
}
console.log("All badge checks passed");
