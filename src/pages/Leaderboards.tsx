import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Podium } from "@/components/Podium";
import { SparklineChart } from "@/components/SparklineChart";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { oversToBalls } from "@/lib/cricket";

const Leaderboards = () => {
  const [topBatsmen, setTopBatsmen] = useState<any[]>([]);
  const [topBowlers, setTopBowlers] = useState<any[]>([]);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [teams, setTeams] = useState<{ id: string; name: string; team_players: { player_id: string }[] }[]>([]);
  const [filterTeam, setFilterTeam] = useState<string>("all");

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    const { data: batsmen } = await supabase
      .from("batting_stats")
      .select("*, players(*)")
      .order("runs", { ascending: false });

    const { data: bowlers } = await supabase
      .from("bowling_stats")
      .select("*, players(*)")
      .order("wickets", { ascending: false });

    const { data: teamData } = await supabase.from("teams").select("id,name,team_players(player_id)").order("name");
    setTeams((teamData as any) || []);

    setTopBatsmen(batsmen || []);
    setTopBowlers(bowlers || []);
  };

  const calculateAverage = (runs: number, innings: number, notOuts: number) => {
    const dismissals = innings - notOuts;
    return dismissals > 0 ? (runs / dismissals).toFixed(2) : "0.00";
  };

  const calculateEconomy = (runsConceded: number, oversBowled: number) => {
    const balls = oversToBalls(oversBowled);
    return balls > 0 ? ((runsConceded / balls) * 6).toFixed(2) : "0.00";
  };

  const getRankChange = (index: number) => {
    // Simulate rank changes (in real app, compare with previous data)
    const changes = [0, 1, -1, 0, 2, -1, 0, 1, 0, -2];
    return changes[index] || 0;
  };

  const getRankIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-performance-excellent" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getPerformanceTrend = () => {
    // Simulate performance trends (in real app, get from historical data)
    return Array.from({ length: 10 }, () => Math.floor(Math.random() * 100) + 50);
  };

  const teamPlayerIds = filterTeam === "all"
    ? null
    : new Set(teams.find((t) => t.id === filterTeam)?.team_players.map((tp) => tp.player_id) ?? []);
  const applyFilters = (rows: any[]) =>
    rows
      .filter((b) => b.players)
      .filter((b) => filterRole === "all" || b.players.role.toLowerCase().includes(filterRole.toLowerCase()))
      .filter((b) => !teamPlayerIds || teamPlayerIds.has(b.player_id))
      .slice(0, 10);
  const filteredBatsmen = applyFilters(topBatsmen);
  const filteredBowlers = applyFilters(topBowlers);
  const strikeRate = (runs: number, balls: number) => (balls > 0 ? ((runs / balls) * 100).toFixed(2) : "-");

  const roles = ["all", "batsman", "bowler", "all-rounder"];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-4 md:py-8 px-3 md:px-4">
        <motion.div 
          className="mb-4 md:mb-8 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">Leaderboards</h1>
          <p className="text-xs md:text-base text-muted-foreground mb-4 md:mb-6">Top performing players</p>

          {/* Team selector */}
          <div className="flex justify-center mb-3">
            <Select value={filterTeam} onValueChange={setFilterTeam}>
              <SelectTrigger className="w-56 md:w-64">
                <SelectValue placeholder="Choose team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter Chips */}
          <div className="flex justify-center gap-1.5 md:gap-2 flex-wrap">
            {roles.map((role) => (
              <motion.button
                key={role}
                onClick={() => setFilterRole(role)}
                className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-full transition-all ${
                  filterRole === role 
                    ? "bg-primary text-primary-foreground shadow-cyan" 
                    : "bg-muted hover:bg-muted/80"
                }`}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.93, y: 1 }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 18, delay: roles.indexOf(role) * 0.1 }}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <Tabs defaultValue="batting" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="batting">Top Batsmen</TabsTrigger>
            <TabsTrigger value="bowling">Top Bowlers</TabsTrigger>
          </TabsList>

          <TabsContent value="batting" className="mt-6">
            {/* Podium for Top 3 */}
            {filteredBatsmen.length >= 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Podium topThree={filteredBatsmen.slice(0, 3)} type="batting" />
              </motion.div>
            )}

            <Card className="shadow-card mt-4 md:mt-8">
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-xl">
                  <Trophy className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                  Top 10 Batsmen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6 pt-0">
                {filteredBatsmen.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No batting stats for this selection yet.</p>}
                {filteredBatsmen.map((stat, index) => {
                  const rankChange = getRankChange(index);
                  const maxRuns = Math.max(...filteredBatsmen.map(s => s.runs));
                  const percentage = maxRuns > 0 ? (stat.runs / maxRuns) * 100 : 0;

                  return (
                    <motion.div
                      key={stat.id}
                      className={`p-2.5 md:p-4 rounded-lg glass-card hover-scale-glow ${
                        index < 3 ? "border-2 border-primary/50" : ""
                      }`}
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-3">
                        <div className="flex items-center gap-2 md:gap-3 flex-1">
                          <div className="flex flex-col items-center">
                            <span className="text-lg md:text-2xl font-bold text-primary">#{index + 1}</span>
                            <div className="w-3 h-3 md:w-4 md:h-4">{getRankIcon(rankChange)}</div>
                          </div>
                          <Avatar className="w-8 h-8 md:w-12 md:h-12">
                            <AvatarImage src={stat.players.profile_photo_url} />
                            <AvatarFallback className="bg-gradient-cyan text-white text-xs md:text-base">
                              {stat.players.name.split(" ").map((n: string) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs md:text-base truncate">{stat.players.name}</p>
                            <p className="text-[10px] md:text-sm text-muted-foreground truncate">{stat.players.role}</p>
                          </div>
                        </div>
                        <div className="text-right space-y-0.5 md:space-y-1">
                          <p className="text-xl md:text-3xl font-bold text-glow">{stat.runs}</p>
                          <p className="text-[10px] md:text-xs text-muted-foreground">
                            Avg: {calculateAverage(stat.runs, stat.innings, stat.not_outs)} · SR: {strikeRate(stat.runs, stat.balls_faced)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="space-y-1.5 md:space-y-2">
                        <Progress value={percentage} className="h-1.5 md:h-2" />
                        <div className="h-8 md:h-12">
                          <SparklineChart data={getPerformanceTrend()} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bowling" className="mt-6">
            {/* Podium for Top 3 */}
            {filteredBowlers.length >= 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Podium topThree={filteredBowlers.slice(0, 3)} type="bowling" />
              </motion.div>
            )}

            <Card className="shadow-card mt-4 md:mt-8">
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-xl">
                  <Trophy className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                  Top 10 Bowlers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6 pt-0">
                {filteredBowlers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No bowling stats for this selection yet.</p>}
                {filteredBowlers.map((stat, index) => {
                  const rankChange = getRankChange(index);
                  const maxWickets = Math.max(...filteredBowlers.map(s => s.wickets));
                  const percentage = maxWickets > 0 ? (stat.wickets / maxWickets) * 100 : 0;

                  return (
                    <motion.div
                      key={stat.id}
                      className={`p-2.5 md:p-4 rounded-lg glass-card hover-scale-glow ${
                        index < 3 ? "border-2 border-primary/50" : ""
                      }`}
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-3">
                        <div className="flex items-center gap-2 md:gap-3 flex-1">
                          <div className="flex flex-col items-center">
                            <span className="text-lg md:text-2xl font-bold text-primary">#{index + 1}</span>
                            <div className="w-3 h-3 md:w-4 md:h-4">{getRankIcon(rankChange)}</div>
                          </div>
                          <Avatar className="w-8 h-8 md:w-12 md:h-12">
                            <AvatarImage src={stat.players.profile_photo_url} />
                            <AvatarFallback className="bg-gradient-cyan text-white text-xs md:text-base">
                              {stat.players.name.split(" ").map((n: string) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs md:text-base truncate">{stat.players.name}</p>
                            <p className="text-[10px] md:text-sm text-muted-foreground truncate">{stat.players.role}</p>
                          </div>
                        </div>
                        <div className="text-right space-y-0.5 md:space-y-1">
                          <p className="text-xl md:text-3xl font-bold text-glow">{stat.wickets}</p>
                          <p className="text-[10px] md:text-xs text-muted-foreground">
                            Econ: {calculateEconomy(stat.runs_conceded, stat.overs_bowled)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="space-y-1.5 md:space-y-2">
                        <Progress value={percentage} className="h-1.5 md:h-2" />
                        <div className="h-8 md:h-12">
                          <SparklineChart data={getPerformanceTrend()} color="hsl(var(--accent))" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Leaderboards;
