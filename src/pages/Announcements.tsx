import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar } from "lucide-react";
import { format } from "date-fns";

const Announcements = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
    fetchAnnouncements();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("announcement_date", { ascending: false });

    setAnnouncements(data || []);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-4 md:py-8 px-3 md:px-4">
        <div className="mb-4 md:mb-8 text-center">
          <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">Announcements</h1>
          <p className="text-xs md:text-base text-muted-foreground">Latest news and updates</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-3 md:space-y-6">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="shadow-card hover:shadow-cricket transition-all duration-300">
              <CardHeader className="p-3 md:p-6">
                <div className="flex items-start justify-between gap-2 md:gap-4">
                  <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                    <div className="w-7 h-7 md:w-10 md:h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bell className="w-3.5 h-3.5 md:w-5 md:h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm md:text-xl mb-1 md:mb-2 line-clamp-2">{announcement.title}</CardTitle>
                      <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                        <span className="truncate">{format(new Date(announcement.announcement_date), "MMM dd, yyyy")}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="whitespace-nowrap text-[10px] md:text-xs flex-shrink-0">
                    {format(new Date(announcement.created_at), "MMM dd")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <p className="text-xs md:text-base text-muted-foreground leading-relaxed">{announcement.description}</p>
              </CardContent>
            </Card>
          ))}

          {announcements.length === 0 && (
            <Card className="shadow-card">
              <CardContent className="py-8 md:py-12 text-center">
                <Bell className="w-8 h-8 md:w-12 md:h-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
                <p className="text-xs md:text-base text-muted-foreground">No announcements yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Announcements;