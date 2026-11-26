// Self-contained checks for the form-guide helpers. Run: bun src/lib/cricket.test.ts
import { buildFormGuide, formOutcome } from "./cricket";

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

// formOutcome rules: 50+ runs or 3 wickets = great, 25 runs or 2 wickets = good, any score = ok, else quiet
check("50 runs is great", formOutcome({ runs: 50 }), "great");
check("100 runs is great", formOutcome({ runs: 100 }), "great");
check("3 wickets is great", formOutcome(null, { wickets: 3 }), "great");
check("0 runs + 4 wickets is great", formOutcome({ runs: 0 }, { wickets: 4 }), "great");
check("25 runs is good", formOutcome({ runs: 25 }), "good");
check("49 runs is good", formOutcome({ runs: 49 }), "good");
check("2 wickets is good", formOutcome(null, { wickets: 2 }), "good");
check("49 runs + 2 wickets is good", formOutcome({ runs: 49 }, { wickets: 2 }), "good");
check("12 runs is ok", formOutcome({ runs: 12 }), "ok");
check("1 wicket is ok", formOutcome(null, { wickets: 1 }), "ok");
check("0 runs is quiet", formOutcome({ runs: 0 }), "quiet");
check("nothing is quiet", formOutcome({ runs: 0 }, { wickets: 0 }), "quiet");
check("no stats is quiet", formOutcome(), "quiet");

const bat = (id: string, runs: number, date: string) => ({ match_id: id, runs, balls: 10, not_out: false, matches: { match_date: date } });
const bowl = (id: string, wickets: number, date: string) => ({ match_id: id, wickets, runs: 20, balls: 12, matches: { match_date: date } });

// buildFormGuide: newest first, merged batting+bowling, capped at 5
const entries = buildFormGuide([bat("a", 10, "2026-01-01"), bat("b", 20, "2026-03-01"), bat("c", 30, "2026-02-01")], []);
check("sorts newest first", entries.map((e) => e.match_id), ["b", "c", "a"]);

const merged = buildFormGuide([bat("a", 30, "2026-01-01")], [bowl("a", 2, "2026-01-01")]);
check("merges same-match rows", [merged.length, merged[0].runs, merged[0].wickets], [1, 30, 2]);

const seven = ["a", "b", "c", "d", "e", "f", "g"].map((id, i) => bat(id, 5, `2026-01-0${i + 1}`));
const capped = buildFormGuide(seven, []);
check("caps at 5, newest g", [capped.length, capped[0].match_id, capped.at(-1)!.match_id], [5, "g", "c"]);

if (failed > 0) {
  console.error(`${failed} check(s) failed`);
  throw new Error("form-guide checks failed");
}
console.log("All form-guide checks passed");
