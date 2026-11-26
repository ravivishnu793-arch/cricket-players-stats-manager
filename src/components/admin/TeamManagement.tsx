import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Users, Upload, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { teamSchema, validateFile } from "@/lib/validation";
import { getErrorMessage } from "@/lib/errorHandling";

const TeamManagement = () => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [newTeam, setNewTeam] = useState({ 
    name: "", 
    captain_id: "", 
    vice_captain_id: "",
    matches_played: 0,
    wins: 0,
    losses: 0
  });
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editSquad, setEditSquad] = useState<string[]>([]);

  useEffect(() => {
    fetchTeams();
    fetchPlayers();
  }, []);

  const fetchTeams = async () => {
    const { data } = await supabase
      .from("teams")
      .select(`
        *,
        captain:captain_id(name),
        vice_captain:vice_captain_id(name),
        team_players(players(*))
      `);
    setTeams(data || []);
  };

  const fetchPlayers = async () => {
    const { data } = await supabase.from("players").select("*").order("name");
    setPlayers(data || []);
  };

  const uploadLogo = async (file: File, teamId: string) => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Sanitize filename
    const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const fileName = `${teamId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('team-logos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('team-logos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleAddTeam = async () => {
    // Validate team data
    try {
      teamSchema.parse({
        name: newTeam.name,
        matches_played: newTeam.matches_played,
        wins: newTeam.wins,
        losses: newTeam.losses
      });
    } catch (error: any) {
      toast({
        title: "Validation Error",
        description: error.errors?.[0]?.message || "Invalid team data",
        variant: "destructive",
      });
      return;
    }

    let logoUrl = null;
    
    const winPercentage = newTeam.matches_played > 0 
      ? ((newTeam.wins / newTeam.matches_played) * 100).toFixed(2)
      : "0.00";

    const { data: team, error } = await supabase
      .from("teams")
      .insert([{
        name: newTeam.name,
        captain_id: newTeam.captain_id || null,
        vice_captain_id: newTeam.vice_captain_id || null,
        matches_played: newTeam.matches_played,
        wins: newTeam.wins,
        losses: newTeam.losses,
        win_percentage: parseFloat(winPercentage),
        logo_url: logoUrl,
      }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return;
    }

    // Upload logo if provided
    if (logoFile && team) {
      try {
        logoUrl = await uploadLogo(logoFile, team.id);
        await supabase
          .from("teams")
          .update({ logo_url: logoUrl })
          .eq("id", team.id);
      } catch (err: any) {
        toast({
          title: "Warning",
          description: getErrorMessage(err),
          variant: "destructive",
        });
      }
    }

    // Add selected players to team
    if (selectedPlayers.length > 0) {
      const teamPlayers = selectedPlayers.map((playerId) => ({
        team_id: team.id,
        player_id: playerId,
      }));

      await supabase.from("team_players").insert(teamPlayers);
    }

    toast({ title: "Success", description: "Team created successfully!" });
    setNewTeam({ name: "", captain_id: "", vice_captain_id: "", matches_played: 0, wins: 0, losses: 0 });
    setSelectedPlayers([]);
    setLogoFile(null);
    setIsDialogOpen(false);
    fetchTeams();
  };

  const handleEditTeam = async () => {
    if (!editingTeam) return;

    // Validate team data
    try {
      teamSchema.parse({
        name: editingTeam.name,
        matches_played: editingTeam.matches_played,
        wins: editingTeam.wins,
        losses: editingTeam.losses
      });
    } catch (error: any) {
      toast({
        title: "Validation Error",
        description: error.errors?.[0]?.message || "Invalid team data",
        variant: "destructive",
      });
      return;
    }

    let logoUrl = editingTeam.logo_url;
    
    const winPercentage = editingTeam.matches_played > 0 
      ? ((editingTeam.wins / editingTeam.matches_played) * 100).toFixed(2)
      : "0.00";

    // Upload new logo if provided
    if (editLogoFile) {
      try {
        logoUrl = await uploadLogo(editLogoFile, editingTeam.id);
      } catch (err: any) {
        toast({
          title: "Error",
          description: getErrorMessage(err),
          variant: "destructive",
        });
        return;
      }
    }

    const { error } = await supabase
      .from("teams")
      .update({
        name: editingTeam.name,
        captain_id: editingTeam.captain_id || null,
        vice_captain_id: editingTeam.vice_captain_id || null,
        matches_played: editingTeam.matches_played,
        wins: editingTeam.wins,
        losses: editingTeam.losses,
        win_percentage: parseFloat(winPercentage),
        logo_url: logoUrl,
      })
      .eq("id", editingTeam.id);

    if (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return;
    }

    // Sync squad: remove players no longer selected, add new ones
    const current: string[] = (editingTeam.team_players ?? []).map((tp: any) => tp.players?.id).filter(Boolean);
    const toRemove = current.filter((id) => !editSquad.includes(id));
    const toAdd = editSquad.filter((id) => !current.includes(id));
    if (toRemove.length) {
      const { error: rmErr } = await supabase.from("team_players").delete().eq("team_id", editingTeam.id).in("player_id", toRemove);
      if (rmErr) return toast({ title: "Error", description: getErrorMessage(rmErr), variant: "destructive" });
    }
    if (toAdd.length) {
      const { error: addErr } = await supabase.from("team_players").insert(toAdd.map((player_id) => ({ team_id: editingTeam.id, player_id })));
      if (addErr) return toast({ title: "Error", description: getErrorMessage(addErr), variant: "destructive" });
    }

    toast({ title: "Success", description: "Team updated successfully!" });
    setEditingTeam(null);
    setEditLogoFile(null);
    setIsEditDialogOpen(false);
    fetchTeams();
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm("Are you sure you want to delete this team?")) return;

    const { error } = await supabase.from("teams").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success", description: "Team deleted successfully!" });
    fetchTeams();
  };

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Team Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Team Name</Label>
                <Input
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Team Logo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Matches Played</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newTeam.matches_played}
                    onChange={(e) => setNewTeam({ ...newTeam, matches_played: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Wins</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newTeam.wins}
                    onChange={(e) => setNewTeam({ ...newTeam, wins: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Losses</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newTeam.losses}
                    onChange={(e) => setNewTeam({ ...newTeam, losses: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Win Percentage</Label>
                  <Input
                    value={newTeam.matches_played > 0 ? `${((newTeam.wins / newTeam.matches_played) * 100).toFixed(2)}%` : "0%"}
                    disabled
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Captain</Label>
                  <Select
                    value={newTeam.captain_id}
                    onValueChange={(value) => setNewTeam({ ...newTeam, captain_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Captain" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Vice Captain</Label>
                  <Select
                    value={newTeam.vice_captain_id}
                    onValueChange={(value) => setNewTeam({ ...newTeam, vice_captain_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Vice Captain" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Select Players</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                  {players.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => togglePlayerSelection(player.id)}
                      className={`p-2 text-left rounded transition-colors ${
                        selectedPlayers.includes(player.id)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {player.name}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={handleAddTeam} className="w-full">
                Create Team
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams.map((team) => (
          <Card key={team.id}>
            <CardHeader className="bg-gradient-field text-white">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {team.logo_url && (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={team.logo_url} alt={team.name} />
                      <AvatarFallback>{team.name[0]}</AvatarFallback>
                    </Avatar>
                  )}
                  <Users className="w-5 h-5" />
                  {team.name}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTeam(team);
                      setEditSquad((team.team_players ?? []).map((tp: any) => tp.players?.id).filter(Boolean));
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteTeam(team.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Captain</p>
                  <p className="font-semibold">{team.captain?.name || "Not assigned"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vice Captain</p>
                  <p className="font-semibold">{team.vice_captain?.name || "Not assigned"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Matches</p>
                  <p className="font-semibold">{team.matches_played || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Wins</p>
                  <p className="font-semibold text-green-600">{team.wins || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Losses</p>
                  <p className="font-semibold text-red-600">{team.losses || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Win %</p>
                  <p className="font-semibold">{team.win_percentage || 0}%</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Squad ({team.team_players?.length || 0})
                </p>
                <div className="flex flex-wrap gap-2">
                  {team.team_players?.map((tp: any) => (
                    <Badge key={tp.players.id} variant="outline">
                      {tp.players.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Team Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
          </DialogHeader>
          {editingTeam && (
            <div className="space-y-4">
              <div>
                <Label>Team Name</Label>
                <Input
                  value={editingTeam.name}
                  onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Team Logo</Label>
                {editingTeam.logo_url && (
                  <div className="mb-2">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={editingTeam.logo_url} alt={editingTeam.name} />
                      <AvatarFallback>{editingTeam.name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditLogoFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Matches Played</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingTeam.matches_played || 0}
                    onChange={(e) => setEditingTeam({ ...editingTeam, matches_played: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Wins</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingTeam.wins || 0}
                    onChange={(e) => setEditingTeam({ ...editingTeam, wins: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Losses</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingTeam.losses || 0}
                    onChange={(e) => setEditingTeam({ ...editingTeam, losses: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Win Percentage</Label>
                  <Input
                    value={editingTeam.matches_played > 0 ? `${((editingTeam.wins / editingTeam.matches_played) * 100).toFixed(2)}%` : "0%"}
                    disabled
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Captain</Label>
                  <Select
                    value={editingTeam.captain_id || ""}
                    onValueChange={(value) => setEditingTeam({ ...editingTeam, captain_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Captain" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Vice Captain</Label>
                  <Select
                    value={editingTeam.vice_captain_id || ""}
                    onValueChange={(value) => setEditingTeam({ ...editingTeam, vice_captain_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Vice Captain" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Squad ({editSquad.length} selected)</Label>
                <div className="mt-2 max-h-56 overflow-y-auto border rounded-md p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {players.map((player) => (
                    <label key={player.id} className="flex items-center gap-2 text-sm p-1 rounded hover:bg-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editSquad.includes(player.id)}
                        onChange={() =>
                          setEditSquad((prev) => prev.includes(player.id) ? prev.filter((id) => id !== player.id) : [...prev, player.id])
                        }
                      />
                      {player.name}
                    </label>
                  ))}
                </div>
              </div>

              <Button onClick={handleEditTeam} className="w-full">
                Update Team
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamManagement;