import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { announcementSchema } from "@/lib/validation";
import { getErrorMessage } from "@/lib/errorHandling";

const AnnouncementManagement = () => {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    description: "",
    announcement_date: new Date().toISOString().split("T")[0],
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("announcement_date", { ascending: false });
    setAnnouncements(data || []);
  };

  const handleAddAnnouncement = async () => {
    // Validate announcement data
    try {
      announcementSchema.parse(newAnnouncement);
    } catch (error: any) {
      toast({
        title: "Validation Error",
        description: error.errors?.[0]?.message || "Invalid announcement data",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("announcements").insert([newAnnouncement]);

    if (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success", description: "Announcement added successfully!" });
    setNewAnnouncement({
      title: "",
      description: "",
      announcement_date: new Date().toISOString().split("T")[0],
    });
    setIsDialogOpen(false);
    fetchAnnouncements();
  };

  const handleUpdateAnnouncement = async () => {
    // Validate announcement data
    try {
      announcementSchema.parse({
        title: editingAnnouncement.title,
        description: editingAnnouncement.description,
        announcement_date: editingAnnouncement.announcement_date
      });
    } catch (error: any) {
      toast({
        title: "Validation Error",
        description: error.errors?.[0]?.message || "Invalid announcement data",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("announcements")
      .update({
        title: editingAnnouncement.title,
        description: editingAnnouncement.description,
        announcement_date: editingAnnouncement.announcement_date,
      })
      .eq("id", editingAnnouncement.id);

    if (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success", description: "Announcement updated successfully!" });
    setEditingAnnouncement(null);
    setIsEditDialogOpen(false);
    fetchAnnouncements();
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    const { error } = await supabase.from("announcements").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success", description: "Announcement deleted successfully!" });
    fetchAnnouncements();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Announcement Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Announcement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newAnnouncement.description}
                  onChange={(e) =>
                    setNewAnnouncement({ ...newAnnouncement, description: e.target.value })
                  }
                  rows={4}
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newAnnouncement.announcement_date}
                  onChange={(e) =>
                    setNewAnnouncement({ ...newAnnouncement, announcement_date: e.target.value })
                  }
                />
              </div>
              <Button onClick={handleAddAnnouncement} className="w-full">
                Add Announcement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id} className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{announcement.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {format(new Date(announcement.announcement_date), "MMMM dd, yyyy")}
                  </p>
                  <p className="text-muted-foreground">{announcement.description}</p>
                  
                  <div className="flex gap-2 mt-4">
                    <Dialog open={isEditDialogOpen && editingAnnouncement?.id === announcement.id} onOpenChange={(open) => {
                      setIsEditDialogOpen(open);
                      if (!open) setEditingAnnouncement(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingAnnouncement(announcement);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Announcement</DialogTitle>
                        </DialogHeader>
                        {editingAnnouncement && (
                          <div className="space-y-4">
                            <div>
                              <Label>Title</Label>
                              <Input
                                value={editingAnnouncement.title}
                                onChange={(e) =>
                                  setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <Label>Description</Label>
                              <Textarea
                                value={editingAnnouncement.description}
                                onChange={(e) =>
                                  setEditingAnnouncement({
                                    ...editingAnnouncement,
                                    description: e.target.value,
                                  })
                                }
                                rows={4}
                              />
                            </div>
                            <div>
                              <Label>Date</Label>
                              <Input
                                type="date"
                                value={editingAnnouncement.announcement_date}
                                onChange={(e) =>
                                  setEditingAnnouncement({
                                    ...editingAnnouncement,
                                    announcement_date: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <Button onClick={handleUpdateAnnouncement} className="w-full">
                              Update Announcement
                            </Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AnnouncementManagement;