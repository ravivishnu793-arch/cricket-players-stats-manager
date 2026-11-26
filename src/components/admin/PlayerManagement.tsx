import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Edit, Plus, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { playerSchema, validateFile } from "@/lib/validation";
import { getErrorMessage } from "@/lib/errorHandling";

const PlayerManagement = () => {
  const { toast } = useToast();
  const [players, setPlayers] = useState<any[]>([]);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [newPlayer, setNewPlayer] = useState({
    name: "",
    role: "Batsman",
    matches_played: 0,
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data } = await supabase.from("players").select("*").order("name");
    setPlayers(data || []);
  };

  const handleAddPlayer = async () => {
    // Validate player data
    try {
      playerSchema.parse(newPlayer);
    } catch (error: any) {
      toast({
        title: "Validation Error",
        description: error.errors?.[0]?.message || "Invalid player data",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from("players")
      .insert([newPlayer])
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

    // Initialize stats
    await supabase.from("batting_stats").insert([{ player_id: data.id }]);
    await supabase.from("bowling_stats").insert([{ player_id: data.id }]);

    toast({ title: "Success", description: "Player added successfully!" });
    setNewPlayer({ name: "", role: "Batsman", matches_played: 0 });
    setIsDialogOpen(false);
    fetchPlayers();
  };

  const handleEditPlayer = (player: any) => {
    setEditingPlayer(player);
    setIsEditDialogOpen(true);
  };

  const handleUpdatePlayer = async () => {
    if (!editingPlayer) return;

    // Validate player data
    try {
      playerSchema.parse({
        name: editingPlayer.name,
        role: editingPlayer.role,
        matches_played: editingPlayer.matches_played
      });
    } catch (error: any) {
      toast({
        title: "Validation Error",
        description: error.errors?.[0]?.message || "Invalid player data",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("players")
      .update({
        name: editingPlayer.name,
        role: editingPlayer.role,
        matches_played: editingPlayer.matches_played,
      })
      .eq("id", editingPlayer.id);

    if (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success", description: "Player updated successfully!" });
    setIsEditDialogOpen(false);
    setEditingPlayer(null);
    fetchPlayers();
  };

  const handleDeletePlayer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this player?")) return;

    const { error } = await supabase.from("players").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success", description: "Player deleted successfully!" });
    fetchPlayers();
  };

  const handlePhotoUpload = async (playerId: string, file: File) => {
    setUploadingPhoto(true);
    
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid File",
        description: validation.error,
        variant: "destructive",
      });
      setUploadingPhoto(false);
      return;
    }

    // Sanitize filename to prevent path traversal
    const fileExt = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const fileName = `${playerId}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("player-photos")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({
        title: "Upload Error",
        description: getErrorMessage(uploadError),
        variant: "destructive",
      });
      setUploadingPhoto(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("player-photos")
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("players")
      .update({ profile_photo_url: publicUrl })
      .eq("id", playerId);

    if (updateError) {
      toast({
        title: "Error",
        description: getErrorMessage(updateError),
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Photo uploaded successfully!" });
      fetchPlayers();
    }

    setUploadingPhoto(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Player Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Player
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Player</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select
                  value={newPlayer.role}
                  onValueChange={(value) => setNewPlayer({ ...newPlayer, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Batsman">Batsman</SelectItem>
                    <SelectItem value="Bowler">Bowler</SelectItem>
                    <SelectItem value="All-Rounder">All-Rounder</SelectItem>
                    <SelectItem value="Wicket Keeper">Wicket Keeper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Matches Played</Label>
                <Input
                  type="number"
                  value={newPlayer.matches_played}
                  onChange={(e) =>
                    setNewPlayer({ ...newPlayer, matches_played: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <Button onClick={handleAddPlayer} className="w-full">
                Add Player
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {players.map((player) => (
          <Card key={player.id}>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={player.profile_photo_url} />
                    <AvatarFallback className="bg-gradient-cricket text-white">
                      {player.name.split(" ").map((n: string) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-0 right-0 cursor-pointer">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Upload className="w-3 h-3 text-white" />
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handlePhotoUpload(player.id, e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
                
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{player.name}</h3>
                  <p className="text-sm text-muted-foreground">{player.role}</p>
                  <p className="text-sm text-muted-foreground">{player.matches_played} matches</p>
                  
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPlayer(player)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePlayer(player.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          ))}
      </div>

      {/* Edit Player Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editingPlayer?.name || ""}
                onChange={(e) =>
                  setEditingPlayer({ ...editingPlayer, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={editingPlayer?.role || "Batsman"}
                onValueChange={(value) =>
                  setEditingPlayer({ ...editingPlayer, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Batsman">Batsman</SelectItem>
                  <SelectItem value="Bowler">Bowler</SelectItem>
                  <SelectItem value="All-Rounder">All-Rounder</SelectItem>
                  <SelectItem value="Wicket Keeper">Wicket Keeper</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Matches Played</Label>
              <Input
                type="number"
                value={editingPlayer?.matches_played || 0}
                onChange={(e) =>
                  setEditingPlayer({
                    ...editingPlayer,
                    matches_played: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <Button onClick={handleUpdatePlayer} className="w-full">
              Update Player
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayerManagement;