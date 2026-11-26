import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Users, Target, TrendingUp, TrendingDown, Flame, Snowflake, ArrowLeftRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TeamStatsChart } from "@/components/TeamStatsChart";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { motion } from "framer-motion";
import ShareStatsCardButton from "@/components/ShareStatsCardButton";

const TEAM_COLORS = [
  "hsl(195, 100%, 50%)", // Cyan
  "hsl(142, 76%, 36%)", // Green
  "hsl(271, 91%, 65%)", // Purple
  "hsl(25, 95%, 53%)", // Orange
  "hsl(346, 87%, 43%)", // Red
  "hsl(48, 100%, 50%)", // Yellow
];

const Teams = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<any[]>([]);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    const { data } = await supabase
      .from("teams")
      .select(`
        *,
        captain:captain_id(name),
        vice_captain:vice_captain_id(name),
        team_players(
          players(*)
        )
      `);

    setTeams(data || []);
  };

  const getTeamColor = (index: number) => TEAM_COLORS[index % TEAM_COLORS.length];

  const getStreak = (team: any) => {
    const totalMatches = team.matches_played || 0;
    const wins = team.wins || 0;
    const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
    
    if (winRate >= 70) return { icon: <Flame className="w-5 h-5" />, text: "🔥 Hot Streak", color: "text-orange-500" };
    if (winRate >= 50) return { icon: <TrendingUp className="w-5 h-5" />, text: "⚡ Good Form", color: "text-green-500" };
    if (winRate >= 30) return { icon: <TrendingDown className="w-5 h-5" />, text: "📊 Average", color: "text-yellow-500" };
    return { icon: <Snowflake className="w-5 h-5" />, text: "❄️ Cold Streak", color: "text-blue-400" };
  };

  const handleTeamSelect = (team: any) => {
    if (compareMode) {
      if (selectedTeams.find(t => t.id === team.id)) {
        setSelectedTeams(selectedTeams.filter(t => t.id !== team.id));
      } else if (selectedTeams.length < 2) {
        setSelectedTeams([...selectedTeams, team]);
      }
    } else {
      setSelectedTeam(team);
      setIsDialogOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-4 md:py-8 px-3 md:px-4">
        <div className="mb-4 md:mb-8 text-center">
          <motion.h1 
            className="text-2xl md:text-4xl font-bold mb-1 md:mb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Teams
          </motion.h1>
          <p className="text-xs md:text-base text-muted-foreground mb-3 md:mb-4">View all cricket teams and squads</p>
          
          <motion.button
            onClick={() => {
              setCompareMode(!compareMode);
              setSelectedTeams([]);
            }}
            className={`px-3 md:px-6 py-1.5 md:py-2 text-sm md:text-base rounded-lg transition-all ${
              compareMode 
                ? "bg-primary text-primary-foreground shadow-cyan" 
                : "bg-muted hover:bg-muted/80"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeftRight className="w-3 h-3 md:w-4 md:h-4 inline mr-1 md:mr-2" />
            {compareMode ? "Exit Compare" : "Compare Teams"}
          </motion.button>
        </div>

        {compareMode && selectedTeams.length === 2 && (
          <motion.div 
            className="mb-4 md:mb-8 grid grid-cols-2 gap-3 md:gap-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {selectedTeams.map((team, idx) => {
              const teamColor = getTeamColor(teams.findIndex(t => t.id === team.id));
              return (
                <Card key={team.id} className="glass-card" style={{ borderColor: teamColor }}>
                  <CardHeader className="p-3 md:p-6" style={{ background: `linear-gradient(135deg, ${teamColor}40, ${teamColor}20)` }}>
                    <CardTitle className="flex items-center gap-2 text-sm md:text-lg">
                      {team.logo_url && (
                        <Avatar className="w-6 h-6 md:w-10 md:h-10 border border-2" style={{ borderColor: teamColor }}>
                          <AvatarImage src={team.logo_url} alt={team.name} />
                          <AvatarFallback className="text-xs">{team.name[0]}</AvatarFallback>
                        </Avatar>
                      )}
                      {team.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 md:pt-6 p-3 md:p-6">
                    <div className="grid grid-cols-2 gap-2 md:gap-4 text-center">
                      <div>
                        <p className="text-xs md:text-sm text-muted-foreground">Win %</p>
                        <p className="text-lg md:text-2xl font-bold text-glow">{team.win_percentage || 0}%</p>
                      </div>
                      <div>
                        <p className="text-xs md:text-sm text-muted-foreground">Matches</p>
                        <p className="text-lg md:text-2xl font-bold">{team.matches_played || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {teams.map((team, index) => {
            const teamColor = getTeamColor(index);
            const streak = getStreak(team);
            const isSelected = compareMode && selectedTeams.find(t => t.id === team.id);

            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card 
                  className={`shadow-card hover:shadow-cricket transition-all duration-300 cursor-pointer ${
                    isSelected ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleTeamSelect(team)}
                  style={{ 
                    borderColor: isSelected ? "hsl(var(--primary))" : teamColor,
                    borderWidth: "2px"
                  }}
                >
                  <CardHeader 
                    className="text-white rounded-t-lg relative overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${teamColor}, ${teamColor}dd)` }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: "-100%" }}
                      animate={{ x: "200%" }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    />
                    <CardTitle className="flex items-center gap-2 md:gap-3 relative z-10 text-base md:text-xl">
                      {team.logo_url && (
                        <Avatar className="w-7 h-7 md:w-10 md:h-10 border border-2 border-white">
                          <AvatarImage src={team.logo_url} alt={team.name} />
                          <AvatarFallback className="text-xs">{team.name[0]}</AvatarFallback>
                        </Avatar>
                      )}
                      <Users className="w-4 h-4 md:w-6 md:h-6" />
                      {team.name}
                    </CardTitle>
                    <div className={`flex items-center gap-1.5 md:gap-2 mt-1.5 md:mt-2 ${streak.color}`}>
                      <div className="w-3.5 h-3.5 md:w-5 md:h-5 flex items-center justify-center">{streak.icon}</div>
                      <span className="text-xs md:text-sm font-semibold">{streak.text}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3 md:pt-6 p-3 md:p-6 space-y-3 md:space-y-4">
                    <div className="grid grid-cols-2 gap-2 md:gap-4">
                      <div className="space-y-0.5 md:space-y-1">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <div 
                            className="w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center shadow-lg"
                            style={{ background: `linear-gradient(135deg, ${teamColor}, ${teamColor}dd)` }}
                          >
                            <Trophy className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-white" />
                          </div>
                          <span className="text-xs md:text-sm font-medium">Captain</span>
                        </div>
                        <p className="text-xs md:text-base font-semibold truncate">{team.captain?.name || "Not assigned"}</p>
                      </div>
                      
                      <div className="space-y-0.5 md:space-y-1">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <Award className="w-3 h-3 md:w-4 md:h-4 text-secondary" />
                          <span className="text-xs md:text-sm font-medium">V. Captain</span>
                        </div>
                        <p className="text-xs md:text-base font-semibold truncate">{team.vice_captain?.name || "Not assigned"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 md:gap-2 text-center p-2 md:p-3 glass-card rounded-lg">
                      <div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">Matches</p>
                        <p className="font-bold text-sm md:text-lg">{team.matches_played || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">Wins</p>
                        <p className="font-bold text-sm md:text-lg text-performance-excellent">{team.wins || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">Losses</p>
                        <p className="font-bold text-sm md:text-lg text-destructive">{team.losses || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">Win %</p>
                        <p className="font-bold text-sm md:text-lg text-glow">{team.win_percentage || 0}%</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                      <p className="text-xs md:text-sm font-medium text-muted-foreground">
                        Squad ({team.team_players?.length || 0} players)
                      </p>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {team.team_players?.map((tp: any) => (
                          <Badge 
                            key={tp.players.id} 
                            variant="outline"
                            className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5"
                            style={{ borderColor: teamColor }}
                          >
                            {tp.players.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Team Stats Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedTeam?.logo_url && (
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedTeam.logo_url} alt={selectedTeam.name} />
                  <AvatarFallback>{selectedTeam?.name[0]}</AvatarFallback>
                </Avatar>
              )}
              {selectedTeam?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTeam && (
            <div className="space-y-6">
              <ShareStatsCardButton
                card={{
                  name: selectedTeam.name,
                  eyebrow: "TEAM PERFORMANCE",
                  kind: "TEAM PROFILE",
                  imageUrl: selectedTeam.logo_url,
                  stats: [
                    { label: "Matches", value: selectedTeam.matches_played || 0 },
                    { label: "Wins", value: selectedTeam.wins || 0 },
                    { label: "Losses", value: selectedTeam.losses || 0 },
                    { label: "Win Percentage", value: `${selectedTeam.win_percentage || 0}%` },
                    { label: "Squad Members", value: selectedTeam.team_players?.length || 0 },
                  ],
                }}
              />
              {/* Performance Chart */}
              <Card>
                <CardHeader className="p-3 md:p-6">
                  <CardTitle className="text-sm md:text-xl">Performance Overview</CardTitle>
                </CardHeader>
                <CardContent className="p-3 md:p-6 pt-0">
                  <TeamStatsChart 
                    wins={selectedTeam.wins || 0}
                    losses={selectedTeam.losses || 0}
                    teamColor={getTeamColor(teams.findIndex(t => t.id === selectedTeam.id))}
                  />
                </CardContent>
              </Card>

              {/* Team Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                <Card className="hover-scale-glow">
                  <CardContent className="pt-3 md:pt-6 p-2 md:p-6 text-center">
                    <Target className="w-5 h-5 md:w-8 md:h-8 mx-auto mb-1 md:mb-2 text-primary" />
                    <p className="text-lg md:text-2xl font-bold">{selectedTeam.matches_played || 0}</p>
                    <p className="text-[10px] md:text-sm text-muted-foreground">Matches</p>
                  </CardContent>
                </Card>
                <Card className="hover-scale-glow">
                  <CardContent className="pt-3 md:pt-6 p-2 md:p-6 text-center">
                    <Trophy className="w-5 h-5 md:w-8 md:h-8 mx-auto mb-1 md:mb-2 text-performance-excellent" />
                    <p className="text-lg md:text-2xl font-bold text-performance-excellent">{selectedTeam.wins || 0}</p>
                    <p className="text-[10px] md:text-sm text-muted-foreground">Wins</p>
                  </CardContent>
                </Card>
                <Card className="hover-scale-glow">
                  <CardContent className="pt-3 md:pt-6 p-2 md:p-6 text-center">
                    <TrendingDown className="w-5 h-5 md:w-8 md:h-8 mx-auto mb-1 md:mb-2 text-destructive" />
                    <p className="text-lg md:text-2xl font-bold text-destructive">{selectedTeam.losses || 0}</p>
                    <p className="text-[10px] md:text-sm text-muted-foreground">Losses</p>
                  </CardContent>
                </Card>
                <Card className="hover-scale-glow">
                  <CardContent className="pt-3 md:pt-6 p-2 md:p-6 text-center">
                    <Award className="w-5 h-5 md:w-8 md:h-8 mx-auto mb-1 md:mb-2 text-accent" />
                    <p className="text-lg md:text-2xl font-bold text-glow">{selectedTeam.win_percentage || 0}%</p>
                    <p className="text-[10px] md:text-sm text-muted-foreground">Win %</p>
                  </CardContent>
                </Card>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Teams;
