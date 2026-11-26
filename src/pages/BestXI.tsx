import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Trophy, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { BEST_XI_ROLES, buildBestXI, classifyPlayerRole, replaceBestXIPlayer, type BestXIGroup, type BestXIPlayer } from "@/lib/best-xi";

type RosterPlayer = BestXIPlayer & { photo?: string | null; team?: string | null };

const BestXI = () => {
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [lineup, setLineup] = useState<BestXIGroup[]>(() => buildBestXI([]));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRoster = async () => {
      setIsLoading(true);
      const [playerResult, battingResult, bowlingResult, teamPlayerResult, teamResult] = await Promise.all([
        supabase.from("players").select("id, name, role, profile_photo_url"),
        supabase.from("batting_stats").select("player_id, runs, balls_faced"),
        supabase.from("bowling_stats").select("player_id, wickets, runs_conceded, overs_bowled"),
        supabase.from("team_players").select("player_id, team_id"),
        supabase.from("teams").select("id, name"),
      ]);

      const batting = new Map((battingResult.data || []).map((row) => [row.player_id, row]));
      const bowling = new Map((bowlingResult.data || []).map((row) => [row.player_id, row]));
      const teamNames = new Map((teamResult.data || []).map((team) => [team.id, team.name]));
      const teamByPlayer = new Map((teamPlayerResult.data || []).map((row) => [row.player_id, teamNames.get(row.team_id) || null]));
      const roster: RosterPlayer[] = (playerResult.data || []).map((player) => ({
        id: player.id,
        name: player.name,
        role: player.role,
        photo: player.profile_photo_url,
        team: teamByPlayer.get(player.id) || null,
        runs: batting.get(player.id)?.runs,
        balls_faced: batting.get(player.id)?.balls_faced,
        wickets: bowling.get(player.id)?.wickets,
        runs_conceded: bowling.get(player.id)?.runs_conceded,
        overs_bowled: bowling.get(player.id)?.overs_bowled,
      }));
      setPlayers(roster);
      setLineup(buildBestXI(roster));
      setIsLoading(false);
    };

    void loadRoster();
  }, []);

  const selectedIds = useMemo(() => new Set(lineup.flatMap((group) => group.players.map((player) => player.id))), [lineup]);
  const selectedCount = selectedIds.size;

  const handleChange = (group: BestXIGroup, current: BestXIPlayer | undefined, replacementId: string) => {
    const replacement = players.find((player) => player.id === replacementId);
    if (!replacement || classifyPlayerRole(replacement.role) !== group.category) return;
    setLineup((currentLineup) => replaceBestXIPlayer(currentLineup, group.category, current?.id ?? null, replacement));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container px-3 py-5 md:px-4 md:py-8">
        <header className="mb-6 flex flex-col gap-4 border-b border-primary/20 pb-5 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-primary"><Trophy className="h-4 w-4" /> Cricket selection</p>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">Best XI</h1>
            <p className="mt-1 text-sm text-muted-foreground">A role-balanced lineup ranked from registered player stats.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1.5 border-primary/40 px-3 py-1.5 text-sm">
              <Users className="h-4 w-4" /> {selectedCount} / 11
            </Badge>
            <Button variant="outline" className="gap-2" onClick={() => setLineup(buildBestXI(players))} disabled={isLoading}>
              <RotateCcw className="h-4 w-4" /> Reset XI
            </Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {lineup.map((group) => {
            const categoryPlayers = players.filter((player) => classifyPlayerRole(player.role) === group.category);
            const slots = Array.from({ length: group.required }, (_, index) => group.players[index]);
            return (
              <section key={group.category} className="border-t-2 border-primary/50 pt-3">
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold text-primary">{group.label}</h2>
                  <span className="text-xs text-muted-foreground">{group.players.length} of {group.required}</span>
                </div>
                <div className="space-y-2">
                  {slots.map((player, index) => {
                    const available = categoryPlayers.filter((candidate) => !selectedIds.has(candidate.id) || candidate.id === player?.id);
                    return (
                      <div key={`${group.category}-${index}`} className="flex min-w-0 items-center gap-3 border-b border-border/60 py-2.5">
                        <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                        {player ? (
                          <Avatar className="h-10 w-10 shrink-0 border border-primary/30">
                            <AvatarImage src={players.find((candidate) => candidate.id === player.id)?.photo || undefined} alt={player.name} />
                            <AvatarFallback>{player.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        ) : <div className="h-10 w-10 shrink-0 rounded-full border border-dashed border-muted-foreground/40" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{player?.name || "Position open"}</p>
                          {player && <p className="truncate text-xs text-muted-foreground">{players.find((candidate) => candidate.id === player.id)?.team || player.role} · {player.runs ?? 0} runs · {player.wickets ?? 0} wkts</p>}
                        </div>
                        <Select value={player?.id ?? ""} onValueChange={(value) => handleChange(group, player, value)}>
                          <SelectTrigger aria-label={`Choose ${group.label} position ${index + 1}`} className="h-9 w-[118px] shrink-0 text-xs sm:w-[145px]">
                            <SelectValue placeholder="Select player" />
                          </SelectTrigger>
                          <SelectContent>
                            {available.map((candidate) => <SelectItem key={candidate.id} value={candidate.id}>{candidate.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
                {!isLoading && categoryPlayers.length === 0 && <p className="py-3 text-sm text-muted-foreground">No registered players for this position yet.</p>}
              </section>
            );
          })}
        </div>
        {isLoading && <p className="mt-6 text-center text-sm text-muted-foreground">Loading player statistics…</p>}
      </main>
    </div>
  );
};

export default BestXI;