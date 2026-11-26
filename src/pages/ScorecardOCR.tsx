import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle, History, ScanLine } from "lucide-react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { bestMatch, confidenceLevel, isValidOvers, oversToBalls, strikeRate, economy, normalizeName } from "@/lib/cricket";

type Ref = { id: string; name: string };
type Alias = { player_id: string; alias_normalized: string };
// player choice: existing id | "new" | "ignore"
type Bat = { name: string; choice: string; score: number; team: 1 | 2; position: number | null; runs: number; balls: number; ocrSr: number | null; fours: number; sixes: number; dismissal: string; not_out: boolean };
type Bowl = { name: string; choice: string; score: number; team: 1 | 2; overs: string; maidens: number; runs: number; wickets: number; wides: number; no_balls: number };
type Field = { name: string; choice: string; score: number; catches: number; run_outs: number; stumpings: number };
type MatchForm = { date: string; title: string; venue: string; tournament: string; format: string; overs_limit: string; team1: string; team2: string; team1Choice: string; team2Choice: string; toss_winner: string; toss_decision: string; winner: string; result: string; target: string; t1runs: string; t1wkts: string; t1overs: string; t2runs: string; t2wkts: string; t2overs: string };
type Imp = { id: string; file_name: string; status: string; created_at: string | null; players_detected: number | null; players_matched: number | null; players_new: number | null; confidence: number | null; errors: string[] | null; match_id: string | null; extracted: unknown };

const ACCEPT = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
const n = (v: unknown) => (v === null || v === undefined || v === "" || isNaN(Number(v)) ? 0 : Math.max(0, Math.round(Number(v))));
const statusColor: Record<string, string> = { imported: "bg-success/20 text-success", failed: "bg-destructive/20 text-destructive", review_required: "bg-warning/20 text-warning", processing: "bg-primary/20 text-primary", duplicate: "bg-warning/20 text-warning", cancelled: "bg-muted text-muted-foreground" };

const ConfBadge = ({ score, choice }: { score: number; choice: string }) => {
  if (choice === "new") return <Badge variant="outline">New player</Badge>;
  if (choice === "ignore") return <Badge variant="outline">Ignored</Badge>;
  const l = confidenceLevel(score);
  return <span className="text-xs whitespace-nowrap">{l === "high" ? "🟢" : l === "medium" ? "🟡" : "🔴"} {score}%</span>;
};

const ScorecardOCR = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [players, setPlayers] = useState<Ref[]>([]);
  const [teams, setTeams] = useState<Ref[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [history, setHistory] = useState<Imp[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "uploading" | "reading" | "review" | "importing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [m, setM] = useState<MatchForm | null>(null);
  const [bat, setBat] = useState<Bat[]>([]);
  const [bowl, setBowl] = useState<Bowl[]>([]);
  const [field, setField] = useState<Field[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dupe, setDupe] = useState<{ id: string; title: string | null; match_date: string; result: string | null } | null>(null);
  const [tab, setTab] = useState("upload");

  const loadRefs = useCallback(async () => {
    const [p, t, a, h] = await Promise.all([
      supabase.from("players").select("id,name").order("name"),
      supabase.from("teams").select("id,name").order("name"),
      supabase.from("player_aliases").select("player_id,alias_normalized"),
      supabase.from("ocr_imports").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setPlayers(p.data ?? []); setTeams(t.data ?? []); setAliases(a.data ?? []); setHistory((h.data as Imp[]) ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/auth");
      const { data } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      if (!data) { toast({ title: "Admins only", variant: "destructive" }); return navigate("/"); }
      await loadRefs(); setReady(true);
    })();
  }, [navigate, toast, loadRefs]);

  const pickFile = (f: File | undefined) => {
    setError(null);
    if (!f) return;
    if (!ACCEPT.includes(f.type)) return setError("Unsupported file. Please use PNG, JPG, WEBP or PDF.");
    if (f.size > 15 * 1024 * 1024) return setError("File is too large (max 15 MB).");
    setFile(f); setPreview(URL.createObjectURL(f));
  };

  const matchPlayer = useCallback((name: string) => {
    const b = bestMatch(name, players, aliases);
    if (!b) return { choice: "new", score: 0 };
    return { choice: b.score >= 70 ? b.id : "", score: b.score };
  }, [players, aliases]);

  const matchTeam = useCallback((name: string | null) => {
    if (!name) return "";
    const b = bestMatch(name, teams);
    return b && b.score >= 85 ? b.id : "new";
  }, [teams]);

  // deno-lint-ignore no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadExtracted = (ex: any) => {
    const mt = ex?.match ?? {};
    const inn = (ex?.innings ?? []) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    const t1 = mt.team1 ?? inn[0]?.batting_team ?? "", t2 = mt.team2 ?? inn[0]?.bowling_team ?? "";
    const side = (team: string | undefined, fallback: 1 | 2): 1 | 2 => (team && normalizeName(team) === normalizeName(t2) ? 2 : team && normalizeName(team) === normalizeName(t1) ? 1 : fallback);
    const i1 = inn.find((i) => side(i.batting_team, 1) === 1), i2 = inn.find((i) => side(i.batting_team, 2) === 2);
    setM({
      date: mt.date ?? "", title: mt.title ?? "", venue: mt.venue ?? "", tournament: mt.tournament ?? "", format: mt.format ?? (mt.overs_limit ? `${mt.overs_limit}-over` : ""),
      overs_limit: mt.overs_limit ? String(mt.overs_limit) : "", team1: t1, team2: t2, team1Choice: matchTeam(t1), team2Choice: matchTeam(t2),
      toss_winner: mt.toss_winner ?? "", toss_decision: mt.toss_decision ?? "", winner: mt.winner ?? "", result: mt.result ?? "", target: mt.target ? String(mt.target) : "",
      t1runs: i1?.total_runs != null ? String(i1.total_runs) : "", t1wkts: i1?.wickets != null ? String(i1.wickets) : "", t1overs: i1?.overs ?? "",
      t2runs: i2?.total_runs != null ? String(i2.total_runs) : "", t2wkts: i2?.wickets != null ? String(i2.wickets) : "", t2overs: i2?.overs ?? "",
    });
    const b: Bat[] = [], w: Bowl[] = [], f = new Map<string, Field>();
    inn.forEach((i, idx) => {
      const s = side(i.batting_team, (idx === 0 ? 1 : 2) as 1 | 2);
      (i.batting ?? []).forEach((r: any) => b.push({ name: r.name, ...matchPlayer(r.name), team: s, position: r.position ?? null, runs: n(r.runs), balls: n(r.balls) || (Number(r.strike_rate) > 0 && n(r.runs) > 0 ? Math.round((n(r.runs) * 100) / Number(r.strike_rate)) : 0), ocrSr: r.strike_rate != null && !isNaN(Number(r.strike_rate)) ? Number(r.strike_rate) : null, fours: n(r.fours), sixes: n(r.sixes), dismissal: r.dismissal ?? "", not_out: !!r.not_out })); // eslint-disable-line @typescript-eslint/no-explicit-any
      (i.bowling ?? []).forEach((r: any) => w.push({ name: r.name, ...matchPlayer(r.name), team: (s === 1 ? 2 : 1), overs: String(r.overs ?? "0"), maidens: n(r.maidens), runs: n(r.runs), wickets: n(r.wickets), wides: n(r.wides), no_balls: n(r.no_balls) })); // eslint-disable-line @typescript-eslint/no-explicit-any
      (i.fielding ?? []).forEach((r: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const k = normalizeName(r.name); const e = f.get(k);
        if (e) { e.catches += n(r.catches); e.run_outs += n(r.run_outs); e.stumpings += n(r.stumpings); }
        else f.set(k, { name: r.name, ...matchPlayer(r.name), catches: n(r.catches), run_outs: n(r.run_outs), stumpings: n(r.stumpings) });
      });
    });
    setBat(b); setBowl(w); setField([...f.values()]); setWarnings(ex?.warnings ?? []);
    setStage("review"); setTab("review");
  };

  const extract = async () => {
    if (!file) return;
    setError(null); setStage("uploading");
    const { data: { session } } = await supabase.auth.getSession();
    const path = `${session?.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await supabase.storage.from("scorecards").upload(path, file, { contentType: file.type });
    if (up.error) { setStage("idle"); return setError("Upload failed. Please try again."); }
    const ins = await supabase.from("ocr_imports").insert({ file_name: file.name, file_path: path, status: "processing", created_by: session?.user.id }).select("id").single();
    if (ins.error || !ins.data) { setStage("idle"); return setError("Could not start the import."); }
    setImportId(ins.data.id); setStage("reading");
    const { data, error: fnErr } = await supabase.functions.invoke("scorecard-ocr", { body: { import_id: ins.data.id } });
    if (fnErr || !data?.extracted) {
      let msg = "Could not read this scorecard. Try a clearer image.";
      try { const ctx = (fnErr as { context?: Response })?.context; if (ctx) msg = (await ctx.json()).error ?? msg; } catch { /* keep default */ }
      setStage("idle"); setError(msg); loadRefs(); return;
    }
    loadExtracted(data.extracted); loadRefs();
  };

  const allRows = useMemo(() => [...bat, ...bowl, ...field], [bat, bowl, field]);
  const unresolved = allRows.filter((r) => !r.choice).length;
  const badOvers = bowl.filter((r) => r.choice !== "ignore" && !isValidOvers(r.overs));

  const startImport = async () => {
    if (!m) return;
    if (!m.date) return toast({ title: "Match date is required", variant: "destructive" });
    if (unresolved) return toast({ title: `${unresolved} player(s) need a decision`, description: "Choose an existing player, create new, or ignore.", variant: "destructive" });
    if (badOvers.length) return toast({ title: "Invalid overs", description: "Overs must look like 3 or 3.4 (balls 0-5).", variant: "destructive" });
    if (!m.team1Choice || !m.team2Choice) return toast({ title: "Select both teams", variant: "destructive" });
    // duplicate check (only for existing teams)
    if (m.team1Choice !== "new" && m.team2Choice !== "new") {
      const { data } = await supabase.from("matches").select("id,title,match_date,result,team1_id,team2_id").eq("match_date", m.date);
      const d = (data ?? []).find((x) => [x.team1_id, x.team2_id].sort().join() === [m.team1Choice, m.team2Choice].sort().join());
      if (d) return setDupe(d);
    }
    await doImport("new");
  };

  const doImport = async (mode: "new" | "update") => {
    if (!m) return;
    setDupe(null); setStage("importing");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // create teams if needed
      const teamId = async (choice: string, name: string) => {
        if (choice !== "new") return choice;
        const { data, error } = await supabase.from("teams").insert({ name: name.trim() || "New Team" }).select("id").single();
        if (error) throw new Error("Could not create team " + name);
        return data.id;
      };
      const t1 = await teamId(m.team1Choice, m.team1), t2 = await teamId(m.team2Choice, m.team2);
      // create new players (one per normalized name)
      const created = new Map<string, string>();
      let newCount = 0;
      const resolve = async (name: string, choice: string, team: string | null) => {
        if (choice === "ignore") return null;
        if (choice !== "new") return choice;
        const k = normalizeName(name);
        if (created.has(k)) return created.get(k)!;
        const { data, error } = await supabase.from("players").insert({ name: name.trim(), role: "All-Rounder" }).select("id").single();
        if (error) throw new Error("Could not create player " + name);
        if (team) await supabase.from("team_players").insert({ team_id: team, player_id: data.id });
        await supabase.from("batting_stats").insert({ player_id: data.id });
        await supabase.from("bowling_stats").insert({ player_id: data.id });
        created.set(k, data.id); newCount++;
        return data.id;
      };
      const aliasList: { player_id: string; alias: string }[] = [];
      const addAlias = (name: string, choice: string, pid: string | null) => {
        if (!pid || choice === "new") return;
        const p = players.find((x) => x.id === pid);
        if (p && normalizeName(p.name) !== normalizeName(name)) aliasList.push({ player_id: pid, alias: name });
      };
      const side = (s: 1 | 2) => (s === 1 ? t1 : t2);
      const batting = [], bowling = [], fielding = [];
      for (const r of bat) { const pid = await resolve(r.name, r.choice, side(r.team)); addAlias(r.name, r.choice, pid); if (pid) batting.push({ player_id: pid, team_id: side(r.team), position: r.position, runs: r.runs, balls: r.balls, fours: r.fours, sixes: r.sixes, dismissal: r.dismissal || null, not_out: r.not_out }); }
      for (const r of bowl) { const pid = await resolve(r.name, r.choice, side(r.team)); addAlias(r.name, r.choice, pid); if (pid) bowling.push({ player_id: pid, team_id: side(r.team), balls: oversToBalls(r.overs), maidens: r.maidens, runs: r.runs, wickets: r.wickets, wides: r.wides, no_balls: r.no_balls }); }
      for (const r of field) { const pid = await resolve(r.name, r.choice, null); addAlias(r.name, r.choice, pid); if (pid) fielding.push({ player_id: pid, catches: r.catches, run_outs: r.run_outs, stumpings: r.stumpings }); }
      const byName = (s: string) => (!s ? "" : normalizeName(s) === normalizeName(m.team1) ? t1 : normalizeName(s) === normalizeName(m.team2) ? t2 : "");
      const payload = {
        match: {
          match_date: m.date, title: m.title || `${m.team1} vs ${m.team2}`, venue: m.venue || null, tournament: m.tournament || null, format: m.format || null,
          overs_limit: m.overs_limit, team1_id: t1, team2_id: t2, toss_winner_id: byName(m.toss_winner), toss_decision: m.toss_decision || null,
          winner_id: byName(m.winner), result: m.result || null, target: m.target,
          team1_runs: m.t1runs, team1_wickets: m.t1wkts, team1_balls: m.t1overs ? String(oversToBalls(m.t1overs)) : "",
          team2_runs: m.t2runs, team2_wickets: m.t2wkts, team2_balls: m.t2overs ? String(oversToBalls(m.t2overs)) : "",
        },
        batting, bowling, fielding, aliases: aliasList,
      };
      const { error } = await supabase.rpc("import_scorecard", { _payload: payload, _mode: mode, _existing_id: mode === "update" ? (pendingUpdate.id ?? dupeId) : null, _import_id: importId });
      if (error) throw new Error(error.message.includes("admin") ? error.message : "Import failed. Please check the data and try again.");
      const matched = allRows.filter((r) => r.choice && r.choice !== "new" && r.choice !== "ignore").length;
      const avg = allRows.length ? Math.round(allRows.reduce((s, r) => s + r.score, 0) / allRows.length) : null;
      if (importId) await supabase.from("ocr_imports").update({ players_detected: allRows.length, players_matched: matched, players_new: newCount, confidence: avg }).eq("id", importId);
      void session;
      toast({ title: "Match imported", description: "Career stats have been updated." });
      reset(); loadRefs(); setTab("history");
    } catch (e) {
      setStage("review");
      toast({ title: "Import failed", description: (e as Error).message, variant: "destructive" });
    }
  };
  const [dupeId, setDupeId] = useState<string | null>(null);

  const cancel = async () => {
    if (importId) await supabase.from("ocr_imports").update({ status: "cancelled" }).eq("id", importId);
    reset(); loadRefs();
  };
  const reset = () => { setFile(null); setPreview(null); setM(null); setBat([]); setBowl([]); setField([]); setImportId(null); setStage("idle"); setTab("upload"); setDupeId(null); };

  const PlayerSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select className="h-8 w-full min-w-[130px] rounded-md border bg-background px-2 text-xs" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— choose —</option>
      <option value="new">+ Create new player</option>
      <option value="ignore">Ignore</option>
      {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );
  const num = (v: number, set: (x: number) => void) => <Input type="number" min={0} className="h-8 w-16 text-xs" value={v} onChange={(e) => set(n(e.target.value))} />;
  const upd = <T,>(arr: T[], setArr: (a: T[]) => void, i: number, patch: Partial<T>) => setArr(arr.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const mf = (k: keyof MatchForm, label: string, type = "text") => (
    <div className="space-y-1"><Label className="text-xs">{label}</Label><Input type={type} className="h-9" value={m?.[k] ?? ""} onChange={(e) => setM((p) => (p ? { ...p, [k]: e.target.value } : p))} /></div>
  );

  if (!ready) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container px-3 py-4 md:py-8 max-w-6xl">
        <div className="mb-4">
          <h1 className="text-2xl md:text-4xl font-bold flex items-center gap-2"><ScanLine className="w-7 h-7 text-primary" /> Scorecard OCR</h1>
          <p className="text-sm text-muted-foreground">Upload → read → review → match players → import → stats update</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="review" disabled={!m}>Review</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files[0]); }}
                  className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 cursor-pointer hover:border-primary transition-colors text-center"
                >
                  <Upload className="w-10 h-10 text-primary" />
                  <span className="font-medium">Drag & drop a scorecard, or tap to browse</span>
                  <span className="text-xs text-muted-foreground">PNG, JPG, WEBP or PDF · max 15 MB</span>
                  <input type="file" accept={ACCEPT.join(",")} className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
                </label>
                {file && (
                  <div className="space-y-2">
                    <p className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> {file.name}</p>
                    {preview && (file.type === "application/pdf"
                      ? <iframe src={preview} title="PDF preview" className="w-full h-96 rounded border" />
                      : <img src={preview} alt="Scorecard preview" className="max-h-96 mx-auto rounded border object-contain" />)}
                  </div>
                )}
                {(stage === "uploading" || stage === "reading") && (
                  <div className="space-y-1">
                    <Progress value={stage === "uploading" ? 30 : 70} />
                    <p className="text-xs text-muted-foreground">{stage === "uploading" ? "Uploading…" : "Reading the scorecard — this can take up to a minute…"}</p>
                  </div>
                )}
                {error && <p className="text-sm text-destructive flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</p>}
                <Button onClick={extract} disabled={!file || stage === "uploading" || stage === "reading"} className="w-full md:w-auto">
                  {stage === "uploading" || stage === "reading" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ScanLine className="w-4 h-4 mr-2" />} Extract Scorecard
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="review" className="mt-4 space-y-4">
            {m && (
              <>
                {warnings.length > 0 && <Card className="border-warning"><CardContent className="p-3 text-sm">{warnings.map((w, i) => <p key={i}>⚠️ {w}</p>)}</CardContent></Card>}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-lg">Match</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {mf("date", "Date *", "date")}{mf("title", "Title")}{mf("venue", "Venue")}{mf("tournament", "Tournament")}
                    {mf("format", "Format")}{mf("overs_limit", "Overs limit", "number")}{mf("toss_winner", "Toss winner")}{mf("toss_decision", "Toss decision")}
                    {mf("winner", "Winner (team name)")}{mf("result", "Result")}{mf("target", "Target", "number")}
                    {(["1", "2"] as const).map((s) => {
                      const nameK = `team${s}` as const, chK = `team${s}Choice` as const;
                      return (
                        <div key={s} className="space-y-1 col-span-2 md:col-span-1">
                          <Label className="text-xs">Team {s}: “{m[nameK]}”</Label>
                          <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={m[chK]} onChange={(e) => setM({ ...m, [chK]: e.target.value })}>
                            <option value="">— choose —</option>
                            <option value="new">+ Create new team “{m[nameK]}”</option>
                            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                      );
                    })}
                    {mf("t1runs", "Team 1 runs", "number")}{mf("t1wkts", "Team 1 wickets", "number")}{mf("t1overs", "Team 1 overs")}
                    {mf("t2runs", "Team 2 runs", "number")}{mf("t2wkts", "Team 2 wickets", "number")}{mf("t2overs", "Team 2 overs")}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-lg">Batting</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-left text-muted-foreground"><th className="p-1">Scorecard name</th><th className="p-1">Match</th><th className="p-1">Player</th><th className="p-1">Team</th><th className="p-1">R</th><th className="p-1">B</th><th className="p-1">4s</th><th className="p-1">6s</th><th className="p-1">SR</th><th className="p-1">Dismissal</th><th className="p-1">NO</th></tr></thead>
                      <tbody>{bat.map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-1"><Input className="h-8 min-w-[110px] text-xs" value={r.name} onChange={(e) => upd(bat, setBat, i, { name: e.target.value })} /></td>
                          <td className="p-1"><ConfBadge score={r.score} choice={r.choice} /></td>
                          <td className="p-1"><PlayerSelect value={r.choice} onChange={(v) => upd(bat, setBat, i, { choice: v })} /></td>
                          <td className="p-1"><select className="h-8 rounded-md border bg-background px-1" value={r.team} onChange={(e) => upd(bat, setBat, i, { team: Number(e.target.value) as 1 | 2 })}><option value={1}>{m.team1 || "T1"}</option><option value={2}>{m.team2 || "T2"}</option></select></td>
                          <td className="p-1">{num(r.runs, (x) => upd(bat, setBat, i, { runs: x }))}</td>
                          <td className="p-1">{num(r.balls, (x) => upd(bat, setBat, i, { balls: x }))}</td>
                          <td className="p-1">{num(r.fours, (x) => upd(bat, setBat, i, { fours: x }))}</td>
                          <td className="p-1">{num(r.sixes, (x) => upd(bat, setBat, i, { sixes: x }))}</td>
                          <td className="p-1 whitespace-nowrap">{(() => {
                            const sr = strikeRate(r.runs, r.balls);
                            const off = sr != null && r.ocrSr != null && Math.abs(sr - r.ocrSr) > 1;
                            return <span className={off ? "text-warning" : ""} title={r.ocrSr != null ? `Scorecard SR: ${r.ocrSr}` : undefined}>{sr ?? "-"}{off ? ` ⚠ (card ${r.ocrSr})` : ""}</span>;
                          })()}</td>
                          <td className="p-1"><Input className="h-8 min-w-[120px] text-xs" value={r.dismissal} onChange={(e) => upd(bat, setBat, i, { dismissal: e.target.value })} /></td>
                          <td className="p-1"><input type="checkbox" checked={r.not_out} onChange={(e) => upd(bat, setBat, i, { not_out: e.target.checked })} /></td>
                        </tr>))}</tbody>
                    </table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-lg">Bowling</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-left text-muted-foreground"><th className="p-1">Scorecard name</th><th className="p-1">Match</th><th className="p-1">Player</th><th className="p-1">Team</th><th className="p-1">O</th><th className="p-1">M</th><th className="p-1">R</th><th className="p-1">W</th><th className="p-1">Econ</th><th className="p-1">Wd</th><th className="p-1">NB</th></tr></thead>
                      <tbody>{bowl.map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-1"><Input className="h-8 min-w-[110px] text-xs" value={r.name} onChange={(e) => upd(bowl, setBowl, i, { name: e.target.value })} /></td>
                          <td className="p-1"><ConfBadge score={r.score} choice={r.choice} /></td>
                          <td className="p-1"><PlayerSelect value={r.choice} onChange={(v) => upd(bowl, setBowl, i, { choice: v })} /></td>
                          <td className="p-1"><select className="h-8 rounded-md border bg-background px-1" value={r.team} onChange={(e) => upd(bowl, setBowl, i, { team: Number(e.target.value) as 1 | 2 })}><option value={1}>{m.team1 || "T1"}</option><option value={2}>{m.team2 || "T2"}</option></select></td>
                          <td className="p-1"><Input className={`h-8 w-16 text-xs ${isValidOvers(r.overs) ? "" : "border-destructive"}`} value={r.overs} onChange={(e) => upd(bowl, setBowl, i, { overs: e.target.value })} /></td>
                          <td className="p-1">{num(r.maidens, (x) => upd(bowl, setBowl, i, { maidens: x }))}</td>
                          <td className="p-1">{num(r.runs, (x) => upd(bowl, setBowl, i, { runs: x }))}</td>
                          <td className="p-1">{num(r.wickets, (x) => upd(bowl, setBowl, i, { wickets: x }))}</td>
                          <td className="p-1">{isValidOvers(r.overs) ? economy(r.runs, oversToBalls(r.overs)) ?? "-" : "-"}</td>
                          <td className="p-1">{num(r.wides, (x) => upd(bowl, setBowl, i, { wides: x }))}</td>
                          <td className="p-1">{num(r.no_balls, (x) => upd(bowl, setBowl, i, { no_balls: x }))}</td>
                        </tr>))}</tbody>
                    </table>
                  </CardContent>
                </Card>

                {field.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-lg">Fielding</CardTitle></CardHeader>
                    <CardContent className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="text-left text-muted-foreground"><th className="p-1">Name</th><th className="p-1">Match</th><th className="p-1">Player</th><th className="p-1">Ct</th><th className="p-1">RO</th><th className="p-1">St</th></tr></thead>
                        <tbody>{field.map((r, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-1">{r.name}</td>
                            <td className="p-1"><ConfBadge score={r.score} choice={r.choice} /></td>
                            <td className="p-1"><PlayerSelect value={r.choice} onChange={(v) => upd(field, setField, i, { choice: v })} /></td>
                            <td className="p-1">{num(r.catches, (x) => upd(field, setField, i, { catches: x }))}</td>
                            <td className="p-1">{num(r.run_outs, (x) => upd(field, setField, i, { run_outs: x }))}</td>
                            <td className="p-1">{num(r.stumpings, (x) => upd(field, setField, i, { stumpings: x }))}</td>
                          </tr>))}</tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}

                <div className="flex flex-col-reverse md:flex-row gap-2 md:justify-end sticky bottom-2">
                  <Button variant="outline" onClick={cancel} disabled={stage === "importing"}>Cancel import</Button>
                  <Button onClick={startImport} disabled={stage === "importing"}>
                    {stage === "importing" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Confirm & Import Match {unresolved > 0 && `(${unresolved} unresolved)`}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><History className="w-5 h-5" /> Import history</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                {history.length === 0 ? <p className="text-sm text-muted-foreground">No imports yet.</p> : (
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-muted-foreground"><th className="p-1">Date</th><th className="p-1">File</th><th className="p-1">Status</th><th className="p-1">Detected</th><th className="p-1">Matched</th><th className="p-1">New</th><th className="p-1">Conf.</th><th className="p-1">Notes</th><th className="p-1" /></tr></thead>
                    <tbody>{history.map((h) => (
                      <tr key={h.id} className="border-t">
                        <td className="p-1 whitespace-nowrap">{h.created_at ? new Date(h.created_at).toLocaleDateString() : "-"}</td>
                        <td className="p-1 max-w-[140px] truncate">{h.file_name}</td>
                        <td className="p-1"><span className={`px-2 py-0.5 rounded text-[10px] ${statusColor[h.status] ?? ""}`}>{h.status.replace("_", " ")}</span></td>
                        <td className="p-1">{h.players_detected ?? "-"}</td><td className="p-1">{h.players_matched ?? "-"}</td><td className="p-1">{h.players_new ?? "-"}</td>
                        <td className="p-1">{h.confidence != null ? `${h.confidence}%` : "-"}</td>
                        <td className="p-1 max-w-[180px] truncate text-muted-foreground">{(h.errors ?? []).join("; ")}</td>
                        <td className="p-1">{h.status === "review_required" && h.extracted ? <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setImportId(h.id); loadExtracted(h.extracted); }}>Open</Button> : null}</td>
                      </tr>))}</tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={!!dupe} onOpenChange={(o) => !o && setDupe(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Possible duplicate match found</AlertDialogTitle>
            <AlertDialogDescription>
              {dupe?.title ?? "A match"} on {dupe?.match_date} between the same teams already exists{dupe?.result ? ` (${dupe.result})` : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => { setDupeId(dupe!.id); void doImportUpdate(dupe!.id); }}>Update existing</Button>
            <AlertDialogAction onClick={() => doImport("new")}>Import as new</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  function doImportUpdate(id: string) {
    setDupeId(id);
    // dupeId state updates async; pass through a ref-like closure
    pendingUpdate.id = id;
    return doImport("update");
  }
};

const pendingUpdate: { id: string | null } = { id: null };

export default ScorecardOCR;
