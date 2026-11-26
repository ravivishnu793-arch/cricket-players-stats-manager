import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Target, TrendingUp, Zap } from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { CricketBackground } from "@/components/CricketBackground";

const Index = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPlayers: 0,
    totalTeams: 0,
    topScorer: { name: "", runs: 0 },
    topWicketTaker: { name: "", wickets: 0 },
  });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    fetchStats();

    // Parallax scroll effect
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchStats = async () => {
    const { data: players } = await supabase.from("players").select("*");
    const { data: teams } = await supabase.from("teams").select("*");
    const { data: batting } = await supabase
      .from("batting_stats")
      .select("*, players(name)")
      .order("runs", { ascending: false })
      .limit(1)
      .single();

    const { data: bowling } = await supabase
      .from("bowling_stats")
      .select("*, players(name)")
      .order("wickets", { ascending: false })
      .limit(1)
      .single();

    setStats({
      totalPlayers: players?.length || 0,
      totalTeams: teams?.length || 0,
      topScorer: {
        name: batting?.players?.name || "N/A",
        runs: batting?.runs || 0,
      },
      topWicketTaker: {
        name: bowling?.players?.name || "N/A",
        wickets: bowling?.wickets || 0,
      },
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <CricketBackground />
      
      <div className="relative z-10">
        <Navigation />
        
        <main className="container px-3 md:px-4 py-4 md:py-8 space-y-4 md:space-y-8">
          {/* Hero Section with Parallax */}
          <div 
            className="text-center space-y-2 md:space-y-4 py-6 md:py-16 animate-slide-up"
            style={{ transform: `translateY(${scrollY * 0.3}px)` }}
          >
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold text-primary text-glow px-2">
              Cricket Statistics Manager
            </h1>
            <p className="text-sm md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto px-4">
              Professional statistics tracking for players, teams, and tournaments
            </p>
          </div>

          {/* Stats Overview with Glassmorphism */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <Card className="glass-card hover-scale-glow animate-stagger-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-foreground">Total Players</CardTitle>
                <Users className="h-4 w-4 md:h-5 md:w-5 text-primary animate-pulse" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-2xl md:text-4xl font-bold text-glow">
                  <AnimatedCounter end={stats.totalPlayers} />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card hover-scale-glow animate-stagger-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-foreground">Total Teams</CardTitle>
                <Trophy className="h-4 w-4 md:h-5 md:w-5 text-accent animate-pulse" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-2xl md:text-4xl font-bold text-glow-aqua">
                  <AnimatedCounter end={stats.totalTeams} />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card hover-scale-glow animate-stagger-3 border-primary/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-foreground">Top Scorer</CardTitle>
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary animate-bounce" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold text-primary text-glow line-clamp-1">{stats.topScorer.name}</div>
                <p className="text-[10px] md:text-sm text-muted-foreground mt-0.5 md:mt-1">
                  <AnimatedCounter end={stats.topScorer.runs} /> runs
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card hover-scale-glow animate-stagger-4 border-accent/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-foreground">Top Wicket Taker</CardTitle>
                <Zap className="h-4 w-4 md:h-5 md:w-5 text-accent animate-bounce" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold text-accent text-glow-aqua line-clamp-1">{stats.topWicketTaker.name}</div>
                <p className="text-[10px] md:text-sm text-muted-foreground mt-0.5 md:mt-1">
                  <AnimatedCounter end={stats.topWicketTaker.wickets} /> wickets
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions - Interactive Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mt-6 md:mt-12">
            <button
              onClick={() => navigate("/players")}
              className="group glass-card p-4 md:p-8 rounded-xl hover-scale-glow text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-cyan opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              <Users className="w-8 h-8 md:w-12 md:h-12 text-primary mx-auto mb-2 md:mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300" />
              <h3 className="text-base md:text-xl font-bold text-foreground mb-1 md:mb-2">View Players</h3>
              <p className="text-xs md:text-sm text-muted-foreground">Browse all player profiles</p>
              <div className="mt-2 md:mt-4 h-0.5 md:h-1 w-0 bg-primary mx-auto group-hover:w-full transition-all duration-300 rounded-full shadow-cyan" />
            </button>
            
            <button
              onClick={() => navigate("/leaderboards")}
              className="group glass-card p-4 md:p-8 rounded-xl hover-scale-glow text-center relative overflow-hidden animate-pulse-slow"
            >
              <div className="absolute inset-0 bg-gradient-aqua opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              <Trophy className="w-8 h-8 md:w-12 md:h-12 text-accent mx-auto mb-2 md:mb-4 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300" />
              <h3 className="text-base md:text-xl font-bold text-foreground mb-1 md:mb-2">Leaderboards</h3>
              <p className="text-xs md:text-sm text-muted-foreground">Top performers</p>
              <div className="mt-2 md:mt-4 h-0.5 md:h-1 w-0 bg-accent mx-auto group-hover:w-full transition-all duration-300 rounded-full shadow-cyan" />
            </button>
            
            <button
              onClick={() => navigate("/compare")}
              className="group glass-card p-4 md:p-8 rounded-xl hover-scale-glow text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-cyan opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              <Target className="w-8 h-8 md:w-12 md:h-12 text-secondary mx-auto mb-2 md:mb-4 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
              <h3 className="text-base md:text-xl font-bold text-foreground mb-1 md:mb-2">Compare Players</h3>
              <p className="text-xs md:text-sm text-muted-foreground">Head-to-head stats</p>
              <div className="mt-2 md:mt-4 h-0.5 md:h-1 w-0 bg-secondary mx-auto group-hover:w-full transition-all duration-300 rounded-full shadow-cyan" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
