import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, TrendingUp, Target } from "lucide-react";
import { battingStatsSchema, bowlingStatsSchema } from "@/lib/validation";
import { getErrorMessage } from "@/lib/errorHandling";

const StatsManagement = () => {
  const { toast } = useToast();
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [battingStats, setBattingStats] = useState({
    innings: 0,
    runs: 0,
    not_outs: 0,
    highest_score: 0,
    fours: 0,
    sixes: 0,
    balls_faced: 0,
  });
  const [bowlingStats, setBowlingStats] = useState({
    matches: 0,
    innings: 0,
    wickets: 0,
    runs_conceded: 0,
    overs_bowled: 0,
    best_bowling: "",
    three_wickets: 0,
    four_wickets: 0,
  });

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data } = await supabase.from("players").select("*").order("name");
    setPlayers(data || []);
  };

  const fetchPlayerStats = async (playerId: string) => {
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

    if (batting) {
      setBattingStats({
        innings: batting.innings || 0,
        runs: batting.runs || 0,
        not_outs: batting.not_outs || 0,
        highest_score: batting.highest_score || 0,
        fours: batting.fours || 0,
        sixes: batting.sixes || 0,
        balls_faced: batting.balls_faced || 0,
      });
    }

    if (bowling) {
      setBowlingStats({
        matches: bowling.matches || 0,
        innings: bowling.innings || 0,
        wickets: bowling.wickets || 0,
        runs_conceded: bowling.runs_conceded || 0,
        overs_bowled: bowling.overs_bowled || 0,
        best_bowling: bowling.best_bowling || "",
        three_wickets: bowling.three_wickets || 0,
        four_wickets: bowling.four_wickets || 0,
      });
    }
  };

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayerId(playerId);
    fetchPlayerStats(playerId);
  };

  const calculateAverage = () => {
    const dismissals = battingStats.innings - battingStats.not_outs;
    return dismissals > 0 ? (battingStats.runs / dismissals).toFixed(2) : "0.00";
  };

  const calculateEconomy = () => {
    return bowlingStats.overs_bowled > 0
      ? (bowlingStats.runs_conceded / bowlingStats.overs_bowled).toFixed(2)
      : "0.00";
  };

  const handleSaveBattingStats = async () => {
    if (!selectedPlayerId) return;

    // Validate batting stats
    try {
      battingStatsSchema.parse(battingStats);
    } catch (error: any) {
      toast({
        title: "Validation Error",
        description: error.errors?.[0]?.message || "Invalid batting stats",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("batting_stats")
      .update(battingStats)
      .eq("player_id", selectedPlayerId);

    if (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success", description: "Batting stats updated successfully!" });
  };

  const handleSaveBowlingStats = async () => {
    if (!selectedPlayerId) return;

    // Validate bowling stats
    try {
      bowlingStatsSchema.parse(bowlingStats);
    } catch (error: any) {
      toast({
        title: "Validation Error",
        description: error.errors?.[0]?.message || "Invalid bowling stats",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("bowling_stats")
      .update(bowlingStats)
      .eq("player_id", selectedPlayerId);

    if (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success", description: "Bowling stats updated successfully!" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Player Statistics Management</h2>
        <div className="max-w-md">
          <Label>Select Player</Label>
          <Select value={selectedPlayerId} onValueChange={handlePlayerSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a player to edit stats" />
            </SelectTrigger>
            <SelectContent>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name} - {player.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedPlayerId && (
        <Tabs defaultValue="batting" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="batting">Batting Stats</TabsTrigger>
            <TabsTrigger value="bowling">Bowling Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="batting">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Batting Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Innings</Label>
                    <Input
                      type="number"
                      value={battingStats.innings}
                      onChange={(e) =>
                        setBattingStats({ ...battingStats, innings: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Runs</Label>
                    <Input
                      type="number"
                      value={battingStats.runs}
                      onChange={(e) =>
                        setBattingStats({ ...battingStats, runs: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Not Outs</Label>
                    <Input
                      type="number"
                      value={battingStats.not_outs}
                      onChange={(e) =>
                        setBattingStats({ ...battingStats, not_outs: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Highest Score</Label>
                    <Input
                      type="number"
                      value={battingStats.highest_score}
                      onChange={(e) =>
                        setBattingStats({ ...battingStats, highest_score: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Fours</Label>
                    <Input
                      type="number"
                      value={battingStats.fours}
                      onChange={(e) =>
                        setBattingStats({ ...battingStats, fours: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Sixes</Label>
                    <Input
                      type="number"
                      value={battingStats.sixes}
                      onChange={(e) =>
                        setBattingStats({ ...battingStats, sixes: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Balls Faced</Label>
                    <Input
                      type="number"
                      min="0"
                      value={battingStats.balls_faced}
                      onChange={(e) =>
                        setBattingStats({ ...battingStats, balls_faced: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Auto-Calculated</p>
                  <p className="text-2xl font-bold">
                    Average: {calculateAverage()}
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    Strike Rate: {battingStats.balls_faced > 0 ? ((battingStats.runs / battingStats.balls_faced) * 100).toFixed(2) : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average = Runs ÷ (Innings - Not Outs) · Strike Rate = Runs ÷ Balls × 100
                  </p>
                </div>

                <Button onClick={handleSaveBattingStats} className="w-full gap-2">
                  <Save className="w-4 h-4" />
                  Save Batting Stats
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bowling">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Bowling Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Matches</Label>
                    <Input
                      type="number"
                      value={bowlingStats.matches}
                      onChange={(e) =>
                        setBowlingStats({ ...bowlingStats, matches: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Innings</Label>
                    <Input
                      type="number"
                      value={bowlingStats.innings}
                      onChange={(e) =>
                        setBowlingStats({ ...bowlingStats, innings: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Wickets</Label>
                    <Input
                      type="number"
                      value={bowlingStats.wickets}
                      onChange={(e) =>
                        setBowlingStats({ ...bowlingStats, wickets: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Runs Conceded</Label>
                    <Input
                      type="number"
                      value={bowlingStats.runs_conceded}
                      onChange={(e) =>
                        setBowlingStats({ ...bowlingStats, runs_conceded: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Overs Bowled</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={bowlingStats.overs_bowled}
                      onChange={(e) =>
                        setBowlingStats({ ...bowlingStats, overs_bowled: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Best Bowling (BBF)</Label>
                    <Input
                      placeholder="e.g., 4/25"
                      value={bowlingStats.best_bowling}
                      onChange={(e) =>
                        setBowlingStats({ ...bowlingStats, best_bowling: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>3 Wickets (3W)</Label>
                    <Input
                      type="number"
                      value={bowlingStats.three_wickets}
                      onChange={(e) =>
                        setBowlingStats({ ...bowlingStats, three_wickets: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label>4 Wickets (4W)</Label>
                    <Input
                      type="number"
                      value={bowlingStats.four_wickets}
                      onChange={(e) =>
                        setBowlingStats({ ...bowlingStats, four_wickets: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Auto-Calculated</p>
                  <p className="text-2xl font-bold">
                    Economy Rate: {calculateEconomy()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formula: Runs Conceded ÷ Overs Bowled
                  </p>
                </div>

                <Button onClick={handleSaveBowlingStats} className="w-full gap-2">
                  <Save className="w-4 h-4" />
                  Save Bowling Stats
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default StatsManagement;
