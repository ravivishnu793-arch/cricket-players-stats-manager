import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { SparklineChart } from "@/components/SparklineChart";
import { Activity, Loader2 } from "lucide-react";
import { ballsToOvers, buildFormGuide, formOutcome, type FormEntry, type FormTone } from "@/lib/cricket";

const toneClasses: Record<FormTone, string> = {
  great: "bg-accent/20 border-accent/70 text-accent",
  good: "bg-primary/20 border-primary/70 text-primary",
  ok: "bg-secondary/20 border-secondary/60 text-secondary",
  quiet: "bg-muted/40 border-border text-muted-foreground",
};

const toneLabel: Record<FormTone, string> = {
  great: "Match-winning",
  good: "Good",
  ok: "Steady",
  quiet: "Quiet",
};

const fmtDate = (d: string) => {
  const date = new Date(d);
  return isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const FormGuide = ({ playerId }: { playerId: string }) => {
  const [entries, setEntries] = useState<FormEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    (async () => {
      const [bat, bowl] = await Promise.all([
        supabase
          .from("match_batting")
          .select("match_id, runs, balls, not_out, matches(match_date)")
          .eq("player_id", playerId),
        supabase
          .from("match_bowling")
          .select("match_id, wickets, runs, balls, matches(match_date)")
          .eq("player_id", playerId),
      ]);
      if (cancelled) return;
      setEntries(buildFormGuide(bat.data || [], bowl.data || [], 5));
    })();
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  if (entries === null) {
    return (
      <div className="glass-card p-4 rounded-lg border border-primary/20 flex items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading form…
      </div>
    );
  }

  if (entries.length === 0) return null;

  const runsTrend = entries.map((e) => e.runs ?? 0);

  return (
    <div className="glass-card p-4 md:p-6 rounded-lg border border-primary/20">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h3 className="text-sm md:text-lg font-semibold flex items-center gap-2 text-primary text-glow uppercase tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>
          <Activity className="w-4 h-4 md:w-5 md:h-5" />
          Form Guide
        </h3>
        <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">Last {entries.length} matches</span>
      </div>

      <div className="flex flex-wrap gap-2 md:gap-3">
        {entries.map((e, i) => {
          const tone = formOutcome(
            e.runs != null ? { runs: e.runs } : null,
            e.wickets != null ? { wickets: e.wickets } : null,
          );
          return (
            <motion.div
              key={e.match_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`rounded-lg border px-2.5 py-2 md:px-4 md:py-3 text-center min-w-[4.5rem] md:min-w-[6rem] ${toneClasses[tone]}`}
              title={toneLabel[tone]}
            >
              <p className="text-[9px] md:text-[11px] uppercase tracking-wider opacity-80">{fmtDate(e.date)}</p>
              <p className="font-mono font-bold text-sm md:text-base leading-tight mt-0.5">
                {e.runs != null ? `${e.runs}${e.not_out ? "*" : ""}` : "–"}
                {e.wickets != null && ` · ${e.wickets}w`}
              </p>
              <p className="text-[9px] md:text-[11px] opacity-70 font-mono">
                {e.runs != null && e.balls ? `${e.balls}b` : e.wickets != null && e.bowl_balls ? ballsToOvers(e.bowl_balls) : ""}
              </p>
            </motion.div>
          );
        })}
      </div>

      {entries.length >= 2 && (
        <div className="mt-3 md:mt-4 h-10">
          <SparklineChart data={runsTrend} color="hsl(var(--accent))" />
        </div>
      )}
      <p className="mt-1 md:mt-2 text-[10px] md:text-xs text-muted-foreground">Runs trend across recent matches</p>
    </div>
  );
};

export default FormGuide;
