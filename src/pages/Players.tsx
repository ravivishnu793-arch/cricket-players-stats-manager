import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trophy, Award, Search, Filter, X, GitCompare, Medal } from "lucide-react";
import { computeBadges, type PlayerBadge } from "@/lib/badges";
import PlayerBadges from "@/components/PlayerBadges";
import { PlayerCardSkeleton } from "@/components/PlayerCardSkeleton";
import { PlayerStatsProgress } from "@/components/PlayerStatsProgress";
import FormGuide from "@/components/FormGuide";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import ShareStatsCardButton from "@/components/ShareStatsCardButton";

const PlayerTiltCard = ({ children }: { children: ReactNode }) => {
  const prefersReducedMotion = useReducedMotion();
  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const rotateX = useSpring(targetX, { stiffness: 180, damping: 18, mass: 0.5 });
  const rotateY = useSpring(targetY, { stiffness: 180, damping: 18, mass: 0.5 });

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const tiltStrength = event.pointerType === "touch" ? 2.5 : 7;
    targetX.set(((event.clientY - bounds.top) / bounds.height - 0.5) * -tiltStrength);
    targetY.set(((event.clientX - bounds.left) / bounds.width - 0.5) * tiltStrength);
  };

  const resetTilt = () => {
    targetX.set(0);
    targetY.set(0);
  };

  return (
    <motion.div
      className="[perspective:1000px]"
      style={{ rotateX, rotateY }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      onPointerUp={resetTilt}
      onPointerCancel={resetTilt}
    >
      {children}
    </motion.div>
  );
};

const Players = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<any[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<Map<string, any>>(new Map());
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<Set<string>>(new Set());
  const [maxStats, setMaxStats] = useState({ runs: 0, wickets: 0, matches: 0 });
  const [badgesMap, setBadgesMap] = useState<Record<string, PlayerBadge[]>>({});

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    filterPlayers();
  }, [searchQuery, roleFilter, players]);

  const fetchPlayers = async () => {
    setIsLoading(true);
    const { data: playersData } = await supabase
      .from("players")
      .select("*")
      .order("name");

    const { data: teamsData } = await supabase
      .from("teams")
      .select("*, team_players(player_id)");

    // Fetch all stats to calculate max values and achievement badges
    const { data: battingData } = await supabase.from("batting_stats").select("player_id, runs, balls_faced");
    const { data: bowlingData } = await supabase.from("bowling_stats").select("player_id, wickets, runs_conceded, overs_bowled");
    const { data: matchBatting } = await supabase.from("match_batting").select("player_id, runs");
    const { data: matchBowling } = await supabase.from("match_bowling").select("player_id, wickets");

    const maxRuns = Math.max(...(battingData?.map(b => b.runs) || [0]), 0);
    const maxWickets = Math.max(...(bowlingData?.map(b => b.wickets) || [0]), 0);

    setMaxStats({ runs: maxRuns, wickets: maxWickets, matches: 0 });

    const batByPlayer = new Map<string, any>((battingData || []).map((b: any) => [b.player_id, b]));
    const bowlByPlayer = new Map<string, any>((bowlingData || []).map((b: any) => [b.player_id, b]));
    const matchBatByPlayer = new Map<string, { runs: number }[]>();
    const matchBowlByPlayer = new Map<string, { wickets: number }[]>();
    (matchBatting || []).forEach((r: any) =>
      matchBatByPlayer.set(r.player_id, [...(matchBatByPlayer.get(r.player_id) || []), r]));
    (matchBowling || []).forEach((r: any) =>
      matchBowlByPlayer.set(r.player_id, [...(matchBowlByPlayer.get(r.player_id) || []), r]));

    const badges: Record<string, PlayerBadge[]> = {};
    (playersData || []).forEach((p: any) => {
      badges[p.id] = computeBadges(
        batByPlayer.get(p.id) || null,
        bowlByPlayer.get(p.id) || null,
        matchBatByPlayer.get(p.id) || [],
        matchBowlByPlayer.get(p.id) || [],
      );
    });
    setBadgesMap(badges);

    const teamMap = new Map();
    teamsData?.forEach((team) => {
      // Map all team players
      team.team_players?.forEach((tp: any) => {
        const existingTeam = teamMap.get(tp.player_id);
        if (existingTeam) {
          // Merge captain/vice-captain info if already exists
          teamMap.set(tp.player_id, { ...team, ...existingTeam });
        } else {
          teamMap.set(tp.player_id, { ...team });
        }
      });
      
      // Add captain/vice-captain flags
      if (team.captain_id) {
        const existingTeam = teamMap.get(team.captain_id);
        teamMap.set(team.captain_id, { ...(existingTeam || team), isCaptain: true });
      }
      if (team.vice_captain_id) {
        const existingTeam = teamMap.get(team.vice_captain_id);
        teamMap.set(team.vice_captain_id, { ...(existingTeam || team), isViceCaptain: true });
      }
    });

    setPlayers(playersData || []);
    setFilteredPlayers(playersData || []);
    setTeams(teamMap);
    setIsLoading(false);
  };

  const filterPlayers = () => {
    let filtered = [...players];

    if (searchQuery) {
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(player => player.role === roleFilter);
    }

    setFilteredPlayers(filtered);
  };

  const handlePlayerClick = async (player: any) => {
    setSelectedPlayer(player);
    
    const { data: battingData } = await supabase
      .from("batting_stats")
      .select("*")
      .eq("player_id", player.id)
      .maybeSingle();

    const { data: bowlingData } = await supabase
      .from("bowling_stats")
      .select("*")
      .eq("player_id", player.id)
      .maybeSingle();

    setPlayerStats({
      batting: battingData,
      bowling: bowlingData,
    });
    setIsStatsDialogOpen(true);
  };

  const toggleComparison = (playerId: string) => {
    const newSet = new Set(selectedForComparison);
    if (newSet.has(playerId)) {
      newSet.delete(playerId);
    } else {
      if (newSet.size < 2) {
        newSet.add(playerId);
      }
    }
    setSelectedForComparison(newSet);
  };

  const handleCompare = () => {
    const playerIds = Array.from(selectedForComparison);
    if (playerIds.length === 2) {
      navigate(`/compare?player1=${playerIds[0]}&player2=${playerIds[1]}`);
    }
  };

  const getRoleColor = (role: string) => {
    const roleMap: Record<string, string> = {
      "Batsman": "border-primary/60 bg-primary/10",
      "Bowler": "border-accent/60 bg-accent/10",
      "All-Rounder": "border-secondary/60 bg-secondary/10",
      "Wicket Keeper": "border-destructive/60 bg-destructive/10"
    };
    return roleMap[role] || "border-muted";
  };

  const getRoleBadgeColor = (role: string) => {
    const roleMap: Record<string, string> = {
      "Batsman": "bg-primary text-primary-foreground",
      "Bowler": "bg-accent text-accent-foreground",
      "All-Rounder": "bg-secondary text-secondary-foreground",
      "Wicket Keeper": "bg-destructive text-destructive-foreground"
    };
    return roleMap[role] || "";
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navigation />
      
      <main className="container px-3 md:px-4 py-4 md:py-8 relative z-10">
        <div className="mb-4 md:mb-8 text-center animate-slide-up">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary text-glow mb-1 md:mb-2">Players</h1>
          <p className="text-sm md:text-base lg:text-xl text-muted-foreground">View all registered cricket players</p>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-4 md:mb-8 space-y-3 md:space-y-4 animate-stagger-1">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 md:pl-10 glass-card border-primary/30 focus:border-primary transition-all duration-300 text-sm md:text-base h-9 md:h-10"
              />
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="glass-card border-primary/30 hover:border-primary h-9 md:h-10 text-sm md:text-base"
            >
              <Filter className="mr-2 h-3 w-3 md:h-4 md:w-4" />
              Filters
              {showFilters ? <X className="ml-2 h-3 w-3 md:h-4 md:w-4" /> : null}
            </Button>

            {selectedForComparison.size === 2 && (
              <Button
                onClick={handleCompare}
                className="bg-gradient-cyan hover:shadow-cyan-lg h-9 md:h-10 text-sm md:text-base"
              >
                <GitCompare className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                Compare Players
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="glass-card p-3 md:p-4 rounded-lg border border-primary/30 animate-slide-up">
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center">
                <label className="text-xs md:text-sm font-medium">Role:</label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full md:w-48 text-sm md:text-base h-9 md:h-10">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="Batsman">Batsman</SelectItem>
                    <SelectItem value="Bowler">Bowler</SelectItem>
                    <SelectItem value="All-Rounder">All-Rounder</SelectItem>
                    <SelectItem value="Wicket Keeper">Wicket Keeper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Players Grid with Masonry Effect */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-3 md:gap-6 space-y-3 md:space-y-6">
          {isLoading ? (
            <>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="break-inside-avoid">
                  <PlayerCardSkeleton />
                </div>
              ))}
            </>
          ) : (
            filteredPlayers.map((player, index) => {
              const teamInfo = teams.get(player.id);
              const isSelected = selectedForComparison.has(player.id);
              
              return (
                <div 
                  key={player.id} 
                  className="break-inside-avoid"
                  style={{ 
                    animation: `slideUp 0.5s ease-out ${index * 0.05}s both` 
                  }}
                >
                  <PlayerTiltCard>
                  <Card
                    className={`player-holo-card glass-card overflow-hidden hover-scale-glow cursor-pointer transition-all duration-300 ${getRoleColor(player.role)} ${isSelected ? 'ring-2 ring-primary shadow-cyan-lg' : ''}`}
                  >
                    <CardContent className="relative z-10 p-3 md:p-6">
                      <div className="flex items-start justify-between mb-2 md:mb-4">
                        <div className="flex items-start gap-2 md:gap-4 flex-1">
                          <div className="relative group">
                            <Avatar className="w-14 h-14 md:w-20 md:h-20 border-2 border-primary ring-2 ring-primary/20">
                              <AvatarImage 
                                src={player.profile_photo_url} 
                                alt={player.name}
                                loading="lazy"
                                className="object-cover transition-transform duration-300 group-hover:scale-110"
                              />
                              <AvatarFallback className="gradient-cyan text-white text-base md:text-xl">
                                {player.name.split(" ").map((n: string) => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 rounded-full bg-gradient-cyan opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                          </div>
                          
                          <div className="flex-1 space-y-1 md:space-y-2" onClick={() => handlePlayerClick(player)}>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-bold text-sm md:text-lg leading-tight text-foreground group-hover:text-primary transition-colors">
                                {player.name}
                              </h3>
                            </div>
                            
                            <div className="flex flex-wrap gap-1 md:gap-2">
                              <Badge className={`${getRoleBadgeColor(player.role)} text-[10px] md:text-xs px-1.5 py-0 md:px-2 md:py-0.5`}>
                                {player.role}
                              </Badge>
                              {teamInfo?.isCaptain && (
                                <Badge className="bg-gradient-aqua text-white shadow-cyan text-[10px] md:text-xs px-1.5 py-0 md:px-2 md:py-0.5">
                                  <Trophy className="w-2 h-2 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                                  Captain
                                </Badge>
                              )}
                              {teamInfo?.isViceCaptain && (
                                <Badge className="bg-secondary text-secondary-foreground text-[10px] md:text-xs px-1.5 py-0 md:px-2 md:py-0.5">
                                  <Award className="w-2 h-2 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                                  V. Captain
                                </Badge>
                              )}
                            </div>
                            
                            {teamInfo && (
                              <p className="text-[11px] md:text-sm text-muted-foreground">
                                Team: <span className="font-medium text-foreground">{teamInfo.name}</span>
                              </p>
                            )}
                            {!teamInfo && (
                              <p className="text-[11px] md:text-sm text-muted-foreground italic">
                                No team assigned
                              </p>
                            )}
                            <PlayerBadges badges={badgesMap[player.id] || []} size="sm" />
                          </div>
                        </div>

                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleComparison(player.id)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={!isSelected && selectedForComparison.size >= 2}
                          className="border-primary h-4 w-4 md:h-5 md:w-5"
                        />
                      </div>
                    </CardContent>
                  </Card>
                  </PlayerTiltCard>
                </div>
              );
            })
          )}
        </div>

        {filteredPlayers.length === 0 && !isLoading && (
          <div className="text-center py-8 md:py-12 glass-card rounded-lg">
            <p className="text-base md:text-xl text-muted-foreground">No players found</p>
          </div>
        )}

        {/* Enhanced Player Stats Dialog */}
        <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
          <DialogContent className="max-w-3xl glass-card border-primary/30 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-4">
                <Avatar className="w-20 h-20 border-2 border-primary ring-4 ring-primary/20">
                  <AvatarImage src={selectedPlayer?.profile_photo_url} alt={selectedPlayer?.name} />
                  <AvatarFallback className="gradient-cyan text-white text-2xl">
                    {selectedPlayer?.name.split(" ").map((n: string) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-3xl font-bold text-primary text-glow">{selectedPlayer?.name}</h2>
                  <Badge className={`${getRoleBadgeColor(selectedPlayer?.role)} text-base px-3 py-1`}>
                    {selectedPlayer?.role}
                  </Badge>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-6">
              {selectedPlayer && (
                <ShareStatsCardButton
                  card={{
                    name: selectedPlayer.name,
                    eyebrow: `${selectedPlayer.role}${teams.get(selectedPlayer.id)?.name ? ` · ${teams.get(selectedPlayer.id).name}` : ""}`,
                    kind: "PLAYER PROFILE",
                    imageUrl: selectedPlayer.profile_photo_url,
                    stats: [
                      { label: "Runs", value: playerStats?.batting?.runs ?? 0 },
                      { label: "Strike Rate", value: playerStats?.batting?.balls_faced > 0 ? ((playerStats.batting.runs / playerStats.batting.balls_faced) * 100).toFixed(2) : "—" },
                      { label: "Wickets", value: playerStats?.bowling?.wickets ?? 0 },
                      { label: "Matches", value: playerStats?.bowling?.matches ?? selectedPlayer.matches_played ?? 0 },
                      { label: "Highest Score", value: playerStats?.batting?.highest_score ?? 0 },
                      { label: "Economy", value: playerStats?.bowling?.overs_bowled > 0 ? (playerStats.bowling.runs_conceded / playerStats.bowling.overs_bowled).toFixed(2) : "—" },
                    ],
                  }}
                />
              )}
              {/* Hall of Fame Badges */}
              {selectedPlayer && badgesMap[selectedPlayer.id]?.length > 0 && (
                <div className="glass-card p-4 md:p-5 rounded-lg border border-accent/30 animate-slide-up">
                  <h3 className="text-lg md:text-xl font-semibold mb-3 flex items-center gap-2 text-accent text-glow-aqua">
                    <Medal className="w-5 h-5 md:w-6 md:h-6" />
                    Hall of Fame
                  </h3>
                  <PlayerBadges badges={badgesMap[selectedPlayer.id]} size="lg" />
                </div>
              )}
              {/* Form Guide */}
              {selectedPlayer && <FormGuide playerId={selectedPlayer.id} />}

              {/* Batting Stats */}
              <div className="glass-card p-6 rounded-lg border border-primary/20">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-primary text-glow">
                  <Trophy className="w-6 h-6" />
                  Batting Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-background/50 rounded-lg border border-primary/10">
                    <p className="text-sm text-muted-foreground mb-1">Innings</p>
                    <p className="text-3xl font-bold text-glow">
                      <AnimatedCounter end={playerStats?.batting?.innings || 0} />
                    </p>
                  </div>
                  <div className="p-4 bg-background/50 rounded-lg border border-primary/10">
                    <p className="text-sm text-muted-foreground mb-1">Runs</p>
                    <p className="text-3xl font-bold text-primary text-glow">
                      <AnimatedCounter end={playerStats?.batting?.runs || 0} />
                    </p>
                  </div>
                  <div className="p-4 bg-background/50 rounded-lg border border-primary/10">
                    <p className="text-sm text-muted-foreground mb-1">Not Outs</p>
                    <p className="text-3xl font-bold text-glow">
                      <AnimatedCounter end={playerStats?.batting?.not_outs || 0} />
                    </p>
                  </div>
                  <div className="p-4 bg-background/50 rounded-lg border border-accent/10">
                    <p className="text-sm text-muted-foreground mb-1">Average</p>
                    <p className="text-3xl font-bold text-accent text-glow-aqua">
                      {playerStats?.batting?.innings && playerStats?.batting?.innings > playerStats?.batting?.not_outs
                        ? (playerStats?.batting?.runs / (playerStats?.batting?.innings - playerStats?.batting?.not_outs)).toFixed(2)
                        : "0.00"}
                    </p>
                  </div>
                  <div className="p-4 bg-background/50 rounded-lg border border-primary/10">
                    <p className="text-sm text-muted-foreground mb-1">Highest Score</p>
                    <p className="text-3xl font-bold text-glow">
                      <AnimatedCounter end={playerStats?.batting?.highest_score || 0} />
                    </p>
                  </div>
                  <div className="p-4 bg-background/50 rounded-lg border border-primary/10">
                    <p className="text-sm text-muted-foreground mb-1">Strike Rate</p>
                    <p className="text-3xl font-bold text-primary text-glow">
                      {playerStats?.batting?.balls_faced > 0
                        ? <AnimatedCounter end={(playerStats.batting.runs / playerStats.batting.balls_faced) * 100} precision={2} />
                        : "-"}
                    </p>
                  </div>
                  <div className="p-4 bg-background/50 rounded-lg border border-primary/10">
                    <p className="text-sm text-muted-foreground mb-1">4s / 6s</p>
                    <p className="text-2xl font-bold text-glow">
                      <AnimatedCounter end={playerStats?.batting?.fours || 0} /> / <AnimatedCounter end={playerStats?.batting?.sixes || 0} />
                    </p>
                  </div>
                </div>
              </div>

              {/* Bowling Stats */}
              <div className="glass-card p-6 rounded-lg border border-accent/20">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-accent text-glow-aqua">
                  <Award className="w-6 h-6" />
                  Bowling Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-background/50 rounded-lg border border-accent/10">
                    <p className="text-sm text-muted-foreground mb-1">Matches</p>
                    <p className="text-3xl font-bold text-glow">
                      <AnimatedCounter end={playerStats?.bowling?.matches || 0} />
                    </p>
                  </div>
                  <div className="p-4 bg-background/50 rounded-lg border border-accent/10">
                    <p className="text-sm text-muted-foreground mb-1">Innings</p>
                    <p className="text-3xl font-bold text-glow">
                      <AnimatedCounter end={playerStats?.bowling?.innings || 0} />
                    </p>
                  </div>
                  <div className="p-4 bg-background/50 rounded-lg border border-accent/10">
                    <p className="text-sm text-muted-foreground mb-1">Wickets</p>
                    <p className="text-3xl font-bold text-accent text-glow-aqua">
                      <AnimatedCounter end={playerStats?.bowling?.wickets || 0} />
                    </p>
                  </div>
                  <div className="p-4 bg-background/50 rounded-lg border border-accent/10">
                    <p className="text-sm text-muted-foreground mb-1">Runs Conceded</p>
                    <p className="text-3xl font-bold text-glow">
                      <AnimatedCounter end={playerStats?.bowling?.runs_conceded || 0} />
                    </p>
                  </div>
                  <div className="p-4 bg-background/50 rounded-lg border border-primary/10">
                    <p className="text-sm text-muted-foreground mb-1">Economy</p>
                    <p className="text-3xl font-bold text-primary text-glow">
                      {playerStats?.bowling?.overs_bowled && playerStats?.bowling?.overs_bowled > 0
                        ? <AnimatedCounter end={playerStats.bowling.runs_conceded / playerStats.bowling.overs_bowled} precision={2} />
                        : "0.00"}
                    </p>
                  </div>
                  <div className="p-4 bg-background/50 rounded-lg border border-accent/10">
                    <p className="text-sm text-muted-foreground mb-1">Best Bowling</p>
                    <p className="text-2xl font-bold text-glow">{playerStats?.bowling?.best_bowling || "N/A"}</p>
                  </div>
                  <div className="p-4 bg-background/50 rounded-lg border border-accent/10 md:col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">3W / 4W</p>
                    <p className="text-3xl font-bold text-glow">
                      <AnimatedCounter end={playerStats?.bowling?.three_wickets || 0} /> / <AnimatedCounter end={playerStats?.bowling?.four_wickets || 0} />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Players;
