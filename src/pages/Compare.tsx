import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RadarChart } from "@/components/RadarChart";
import { PerformanceBar } from "@/components/PerformanceBar";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Swords, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const Compare = () => {
  const [players, setPlayers] = useState<any[]>([]);
  const [player1Id, setPlayer1Id] = useState<string>("");
  const [player2Id, setPlayer2Id] = useState<string>("");
  const [player1Stats, setPlayer1Stats] = useState<any>(null);
  const [player2Stats, setPlayer2Stats] = useState<any>(null);
  const [showVS, setShowVS] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (player1Id) fetchPlayerStats(player1Id, 1);
  }, [player1Id]);

  useEffect(() => {
    if (player2Id) fetchPlayerStats(player2Id, 2);
  }, [player2Id]);

  useEffect(() => {
    if (player1Stats && player2Stats) {
      setShowVS(true);
    }
  }, [player1Stats, player2Stats]);

  const fetchPlayers = async () => {
    const { data } = await supabase.from("players").select("*").order("name");
    setPlayers(data || []);
  };

  const fetchPlayerStats = async (playerId: string, playerNum: number) => {
    const { data: player } = await supabase
      .from("players")
      .select("*")
      .eq("id", playerId)
      .single();

    const { data: batting } = await supabase
      .from("batting_stats")
      .select("*")
      .eq("player_id", playerId)
      .single();

    const { data: bowling } = await supabase
      .from("bowling_stats")
      .select("*")
      .eq("player_id", playerId)
      .single();

    const stats = { ...player, batting, bowling };
    
    if (playerNum === 1) {
      setPlayer1Stats(stats);
    } else {
      setPlayer2Stats(stats);
    }
  };

  const swapPlayers = () => {
    const tempId = player1Id;
    const tempStats = player1Stats;
    
    setPlayer1Id(player2Id);
    setPlayer2Id(tempId);
    setPlayer1Stats(player2Stats);
    setPlayer2Stats(tempStats);
  };

  const getWinner = (val1: number, val2: number, higherIsBetter: boolean = true) => {
    if (val1 === val2) return "tie";
    if (higherIsBetter) {
      return val1 > val2 ? "player1" : "player2";
    } else {
      return val1 < val2 ? "player1" : "player2";
    }
  };

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
          <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">Compare Players</h1>
          <p className="text-xs md:text-base text-muted-foreground">Head-to-head player statistics comparison</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-8 relative">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Select value={player1Id} onValueChange={setPlayer1Id}>
              <SelectTrigger className="h-9 md:h-12 text-sm md:text-lg border-2 border-primary">
                <SelectValue placeholder="Select Player 1" />
              </SelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          {/* VS Badge */}
          <AnimatePresence>
            {showVS && (
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ duration: 0.5 }}
              >
                <div className="relative">
                  <motion.div
                    className="w-12 h-12 md:w-20 md:h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-cyan-lg"
                    animate={prefersReducedMotion ? undefined : { scale: [1, 1.06, 1] }}
                    transition={prefersReducedMotion ? undefined : { duration: 2, repeat: Infinity }}
                  >
                    <Swords className="w-6 h-6 md:w-10 md:h-10 text-white" />
                  </motion.div>
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-primary"
                    animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                    transition={prefersReducedMotion ? undefined : { duration: 3, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Select value={player2Id} onValueChange={setPlayer2Id}>
              <SelectTrigger className="h-9 md:h-12 text-sm md:text-lg border-2 border-accent">
                <SelectValue placeholder="Select Player 2" />
              </SelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>
        </div>

        {player1Stats && player2Stats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-6">
              <Button
                onClick={swapPlayers}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Swap Players
              </Button>
            </div>

            <div className="space-y-4 md:space-y-6">
              <motion.div
                className="flex items-center justify-center gap-3 overflow-hidden py-1"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 150, damping: 17 }}
                aria-label={`${player1Stats.name} versus ${player2Stats.name}`}
              >
                <motion.span
                  className="max-w-[40%] truncate text-right text-xs font-semibold text-primary md:text-base"
                  initial={{ x: -60, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 150, damping: 18 }}
                >
                  {player1Stats.name}
                </motion.span>
                <motion.span
                  className="shrink-0 rounded-full border border-performance-average/60 px-3 py-1 text-sm font-black text-performance-average shadow-cyan md:text-lg"
                  initial={{ scale: 0, rotate: -120 }}
                  animate={{ scale: [0, 1.18, 1], rotate: 0 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                >
                  VS
                </motion.span>
                <motion.span
                  className="max-w-[40%] truncate text-xs font-semibold text-accent md:text-base"
                  initial={{ x: 60, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 150, damping: 18 }}
                >
                  {player2Stats.name}
                </motion.span>
              </motion.div>

              {/* Player Info Cards */}
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="text-center shadow-card glass-card border-2 border-primary hover-scale-glow">
                    <CardContent className="pt-3 md:pt-6 p-3 md:p-6">
                      <Avatar className="w-14 h-14 md:w-24 md:h-24 mx-auto mb-2 md:mb-4 border-2 md:border-4 border-primary shadow-cyan">
                        <AvatarImage src={player1Stats.profile_photo_url} />
                        <AvatarFallback className="bg-gradient-cyan text-white text-sm md:text-2xl">
                          {player1Stats.name.split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-bold text-xs md:text-xl mb-1 md:mb-2 truncate">{player1Stats.name}</h3>
                      <Badge variant="outline" className="border-primary text-[10px] md:text-xs">{player1Stats.role}</Badge>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="text-center shadow-card glass-card border-2 border-accent hover-scale-glow">
                    <CardContent className="pt-3 md:pt-6 p-3 md:p-6">
                      <Avatar className="w-14 h-14 md:w-24 md:h-24 mx-auto mb-2 md:mb-4 border-2 md:border-4 border-accent shadow-cyan">
                        <AvatarImage src={player2Stats.profile_photo_url} />
                        <AvatarFallback className="bg-gradient-aqua text-white text-sm md:text-2xl">
                          {player2Stats.name.split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-bold text-xs md:text-xl mb-1 md:mb-2 truncate">{player2Stats.name}</h3>
                      <Badge variant="outline" className="border-accent text-[10px] md:text-xs">{player2Stats.role}</Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Radar Chart */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="shadow-card glass-card">
                  <CardHeader className="p-3 md:p-6">
                    <CardTitle className="text-sm md:text-xl">Multi-Dimensional Comparison</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6 pt-0">
                    <RadarChart 
                      player1Data={player1Stats}
                      player2Data={player2Stats}
                      player1Name={player1Stats.name}
                      player2Name={player2Stats.name}
                    />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Batting Comparison with Performance Bars */}
              {player1Stats.batting && player2Stats.batting && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card className="shadow-card glass-card">
                    <CardHeader className="p-3 md:p-6">
                      <CardTitle className="text-sm md:text-xl">Batting Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 md:space-y-6 p-3 md:p-6 pt-0">
                      <PerformanceBar 
                        label="Runs"
                        value1={player1Stats.batting.runs || 0}
                        value2={player2Stats.batting.runs || 0}
                        player1Name={player1Stats.name}
                        player2Name={player2Stats.name}
                      />
                      <PerformanceBar 
                        label="Highest Score"
                        value1={player1Stats.batting.highest_score || 0}
                        value2={player2Stats.batting.highest_score || 0}
                        player1Name={player1Stats.name}
                        player2Name={player2Stats.name}
                      />
                      <PerformanceBar 
                        label="Fours"
                        value1={player1Stats.batting.fours || 0}
                        value2={player2Stats.batting.fours || 0}
                        player1Name={player1Stats.name}
                        player2Name={player2Stats.name}
                      />
                      <PerformanceBar 
                        label="Sixes"
                        value1={player1Stats.batting.sixes || 0}
                        value2={player2Stats.batting.sixes || 0}
                        player1Name={player1Stats.name}
                        player2Name={player2Stats.name}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Bowling Comparison with Performance Bars */}
              {player1Stats.bowling && player2Stats.bowling && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Card className="shadow-card glass-card">
                    <CardHeader className="p-3 md:p-6">
                      <CardTitle className="text-sm md:text-xl">Bowling Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 md:space-y-6 p-3 md:p-6 pt-0">
                      <PerformanceBar 
                        label="Wickets"
                        value1={player1Stats.bowling.wickets || 0}
                        value2={player2Stats.bowling.wickets || 0}
                        player1Name={player1Stats.name}
                        player2Name={player2Stats.name}
                      />
                      <PerformanceBar 
                        label="3 Wickets"
                        value1={player1Stats.bowling.three_wickets || 0}
                        value2={player2Stats.bowling.three_wickets || 0}
                        player1Name={player1Stats.name}
                        player2Name={player2Stats.name}
                      />
                      <PerformanceBar 
                        label="4 Wickets"
                        value1={player1Stats.bowling.four_wickets || 0}
                        value2={player2Stats.bowling.four_wickets || 0}
                        player1Name={player1Stats.name}
                        player2Name={player2Stats.name}
                      />
                      <PerformanceBar 
                        label="Economy Rate"
                        value1={parseFloat((player1Stats.bowling.runs_conceded / (player1Stats.bowling.overs_bowled || 1)).toFixed(2))}
                        value2={parseFloat((player2Stats.bowling.runs_conceded / (player2Stats.bowling.overs_bowled || 1)).toFixed(2))}
                        player1Name={player1Stats.name}
                        player2Name={player2Stats.name}
                        higherIsBetter={false}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Compare;
