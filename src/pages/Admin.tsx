import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PlayerManagement from "@/components/admin/PlayerManagement";
import TeamManagement from "@/components/admin/TeamManagement";
import AnnouncementManagement from "@/components/admin/AnnouncementManagement";
import StatsManagement from "@/components/admin/StatsManagement";
import { useToast } from "@/hooks/use-toast";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    if (error || !data) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Admin Control Panel</h1>
          <p className="text-muted-foreground">Manage players, teams, and announcements</p>
        </div>

        <Tabs defaultValue="players" className="w-full">
          <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-4">
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="players" className="mt-6">
            <PlayerManagement />
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            <StatsManagement />
          </TabsContent>

          <TabsContent value="teams" className="mt-6">
            <TeamManagement />
          </TabsContent>

          <TabsContent value="announcements" className="mt-6">
            <AnnouncementManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;