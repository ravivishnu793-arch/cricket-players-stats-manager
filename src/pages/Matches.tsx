import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, MapPin, Trophy, Search, Award, Swords, Share2, Trash2 } from "lucide-react";
import { ballsToOvers, strikeRate, economy, impactScore } from "@/lib/cricket";

type Team = { id: string; name: string; logo_url: string | null };

const fmtScore = (r: number | null, w: number | null, b: number | null) =>
  r == null ? "—" : `${r}/${w ?? 0}${b ? ` (${ballsToOvers(b)})` : ""}`;

const TeamLogo = ({ team, size = "w-10 h-10" }: { team?: Team; size?: string }) =>
  team?.logo_url ? (
    <img src={team.logo_url} alt={team.name} className={`${size} rounded-full object-cover ring-2 ring-primary/40`} />
  ) : (
    <div className={`${size} rounded-full bg-primary/20 ring-2 ring-primary/40 flex items-center justify-center font-bold text-primary text-sm`}>
      {team?.name?.slice(0, 2).toUpperCase() ?? "?"}
    </div>
  );

const Matches = () => {
  const { toast } = useToast();
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [card, setCard] = useState<{ bat: any[]; bowl: any[] } | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: m }, { data: t }, { data: { session } }] = await Promise.all([
        supabase.from("matches").select("*").order("match_date", { ascending: false }),
        supabase.from("teams").select("id,name,logo_url"),
        supabase.auth.getSession(),
      ]);
      setMatches(m || []);
      setTeams(Object.fromEntries((t || []).map((x) => [x.id, x])));
      if (session) {
        const { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(Boolean(role));
      }
      setLoading(false);
    })();
  }, []);

  const open = async (m: any) => {
    setSelected(m);
    setCard(null);
    const [{ data: bat }, { data: bowl }] = await Promise.all([
      supabase.from("match_batting").select("*, players(name)").eq("match_id", m.id).order("position"),
      supabase.from("match_bowling").select("*, players(name)").eq("match_id", m.id),
    ]);
    setCard({ bat: bat || [], bowl: bowl || [] });
  };

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return matches.filter((m) =>
      [m.title, m.venue, m.tournament, teams[m.team1_id]?.name, teams[m.team2_id]?.name]
        .some((v) => v?.toLowerCase().includes(s)));
  }, [matches, teams, q]);

  const potm = useMemo(() => {
    if (!card) return null;
    const ids = new Set([...card.bat, ...card.bowl].map((r) => r.player_id));
    let best: any = null;
    ids.forEach((id) => {
      const b = card.bat.find((r) => r.player_id === id);
      const w = card.bowl.find((r) => r.player_id === id);
      const score = impactScore(b, w);
      if (!best || score > best.score) best = { id, name: b?.players?.name || w?.players?.name, score, b, w };
    });
    return best && best.score > 0 ? best : null;
  }, [card]);

  const shareScorecard = async () => {
    if (!selected || !card) return;

    const team1 = teams[selected.team1_id]?.name ?? "Team 1";
    const team2 = teams[selected.team2_id]?.name ?? "Team 2";
    const title = selected.title || `${team1} vs ${team2}`;
    const lines = [
      title,
      new Date(selected.match_date).toLocaleDateString(),
      `${team1}: ${fmtScore(selected.team1_runs, selected.team1_wickets, selected.team1_balls)}`,
      `${team2}: ${fmtScore(selected.team2_runs, selected.team2_wickets, selected.team2_balls)}`,
      selected.result,
      selected.venue ? `Venue: ${selected.venue}` : null,
      "",
      ...teamIds.flatMap((id) => {
        const battingTeam = teams[id]?.name ?? "Team";
        const batting = card.bat.filter((row) => row.team_id === id);
        const bowling = card.bowl.filter((row) => row.team_id !== id && teamIds.includes(row.team_id));
        return [
          `${battingTeam} batting`,
          ...batting.map((row) => `  ${row.players?.name ?? "Player"}: ${row.runs}${row.not_out ? "*" : ""} (${row.balls})`),
          `${battingTeam} bowling`,
          ...bowling.map((row) => `  ${row.players?.name ?? "Player"}: ${row.wickets}/${row.runs} (${ballsToOvers(row.balls)} overs)`),
          "",
        ];
      }),
    ].filter((line): line is string => Boolean(line));
    const text = lines.join("\n");
    const url = `${window.location.origin}/matches`;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast({ title: "Scorecard copied", description: "Share it with your friends." });
      } else {
        throw new Error("Sharing is not supported in this browser.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast({
        title: "Unable to share scorecard",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteScorecard = async () => {
    if (!selected || !isAdmin) return;
    setIsDeleting(true);
    const { error } = await supabase.rpc("delete_match_scorecard", { _match_id: selected.id });
    setIsDeleting(false);

    if (error) {
      const migrationMissing = error.code === "PGRST202" || error.message.includes("delete_match_scorecard");
      toast({
        title: "Unable to delete scorecard",
        description: migrationMissing
          ? "The database update is not installed yet. Apply the delete-match migration in Supabase, then try again."
          : error.message,
        variant: "destructive",
      });
      return;
    }

    setMatches((current) => current.filter((match) => match.id !== selected.id));
    setShowDeleteConfirmation(false);
    setSelected(null);
    setCard(null);
    toast({ title: "Scorecard deleted", description: "The match and its scorecard data were removed." });
  };

  const teamIds = selected ? [selected.team1_id, selected.team2_id] : [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-3 md:px-4 py-6 md:py-10 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl md:text-4xl font-bold uppercase tracking-wider text-primary" style={{ fontFamily: "Orbitron, sans-serif" }}>
            Match Center
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">Every completed match with full scorecards.</p>
        </motion.div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search team, venue or tournament" className="pl-9" />
        </div>

        {loading ? (
          <div className="grid gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="glass-card"><CardContent className="py-12 text-center text-muted-foreground">
            <Swords className="w-10 h-10 mx-auto mb-3 opacity-50" />No matches yet. Imported scorecards will appear here.
          </CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((m, i) => {
              const t1 = teams[m.team1_id], t2 = teams[m.team2_id];
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}>
                  <Card onClick={() => open(m)} className="glass-card cursor-pointer hover:border-primary/60 hover:shadow-[0_0_24px_hsl(var(--primary)/0.25)] transition-all">
                    <CardContent className="p-4 md:p-5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{new Date(m.match_date).toLocaleDateString()}</span>
                        {m.venue && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{m.venue}</span>}
                        {m.tournament && <Badge variant="secondary">{m.tournament}</Badge>}
                        {m.overs_limit && <Badge variant="outline">{m.overs_limit} overs</Badge>}
                      </div>
                      {[[t1, m.team1_id, m.team1_runs, m.team1_wickets, m.team1_balls], [t2, m.team2_id, m.team2_runs, m.team2_wickets, m.team2_balls]].map(([t, id, r, w, b]: any, k) => (
                        <div key={k} className={`flex items-center justify-between py-1.5 ${m.winner_id === id ? "text-foreground" : "text-muted-foreground"}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <TeamLogo team={t} size="w-8 h-8" />
                            <span className="font-semibold truncate">{t?.name ?? "TBD"}</span>
                            {m.winner_id === id && <Trophy className="w-4 h-4 text-accent shrink-0" />}
                          </div>
                          <span className="font-mono font-bold">{fmtScore(r, w, b)}</span>
                        </div>
                      ))}
                      {m.result && <p className="mt-2 text-sm text-primary font-medium">{m.result}</p>}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">
                  {teams[selected.team1_id]?.name ?? "TBD"} vs {teams[selected.team2_id]?.name ?? "TBD"}
                </DialogTitle>
                {selected.result && <p className="text-sm text-primary">{selected.result}</p>}
              </DialogHeader>

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" className="gap-2" onClick={shareScorecard} disabled={!card}>
                  <Share2 className="h-4 w-4" />Share Scorecard
                </Button>
                {isAdmin && (
                  <Button type="button" variant="destructive" className="gap-2" onClick={() => setShowDeleteConfirmation(true)}>
                    <Trash2 className="h-4 w-4" />Delete Scorecard
                  </Button>
                )}
              </div>

              <AnimatePresence>
                {potm && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="rounded-xl p-4 bg-gradient-to-r from-accent/25 to-primary/20 border border-accent/50 flex items-center gap-3">
                    <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}>
                      <Award className="w-8 h-8 text-accent" />
                    </motion.div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Player of the Match</p>
                      <p className="font-bold text-lg">{potm.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {potm.b && `${potm.b.runs}${potm.b.not_out ? "*" : ""} (${potm.b.balls})`}
                        {potm.b && potm.w && " · "}
                        {potm.w && `${potm.w.wickets}/${potm.w.runs} (${ballsToOvers(potm.w.balls)})`}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!card ? <Skeleton className="h-48" /> : (
                <Tabs defaultValue={teamIds[0] ?? "x"}>
                  <TabsList className="w-full">
                    {teamIds.map((id) => <TabsTrigger key={id} value={id} className="flex-1">{teams[id]?.name ?? "Team"}</TabsTrigger>)}
                  </TabsList>
                  {teamIds.map((id) => {
                    const bat = card.bat.filter((r) => r.team_id === id);
                    const bowl = card.bowl.filter((r) => r.team_id !== id && teamIds.includes(r.team_id));
                    return (
                      <TabsContent key={id} value={id} className="space-y-4">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="text-muted-foreground text-xs uppercase"><tr className="border-b">
                              <th className="text-left py-2">Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>
                            <tbody>{bat.map((r, i) => (
                              <motion.tr key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="border-b border-border/50 text-center">
                                <td className="text-left py-2"><div className="font-medium">{r.players?.name}{r.not_out && "*"}</div>
                                  <div className="text-xs text-muted-foreground">{r.not_out ? "not out" : r.dismissal}</div></td>
                                <td className="font-bold">{r.runs}</td><td>{r.balls}</td><td>{r.fours}</td><td>{r.sixes}</td>
                                <td>{strikeRate(r.runs, r.balls)?.toFixed(1) ?? "–"}</td>
                              </motion.tr>))}
                              {bat.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No batting data</td></tr>}
                            </tbody>
                          </table>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="text-muted-foreground text-xs uppercase"><tr className="border-b">
                              <th className="text-left py-2">Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th></tr></thead>
                            <tbody>{bowl.map((r, i) => (
                              <motion.tr key={r.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="border-b border-border/50 text-center">
                                <td className="text-left py-2 font-medium">{r.players?.name}</td>
                                <td>{ballsToOvers(r.balls)}</td><td>{r.maidens}</td><td>{r.runs}</td>
                                <td className="font-bold">{r.wickets}</td><td>{economy(r.runs, r.balls)?.toFixed(2) ?? "–"}</td>
                              </motion.tr>))}
                              {bowl.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No bowling data</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this match scorecard?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the match and its batting, bowling, and fielding records. Career totals will be adjusted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void deleteScorecard(); }} disabled={isDeleting}>
              {isDeleting ? "Deleting…" : "Delete Scorecard"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Matches;
