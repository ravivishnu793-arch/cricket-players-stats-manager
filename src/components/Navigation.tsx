import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Trophy, Users, BarChart3, GitCompare, Bell, Shield, LogOut, KeyRound, Bot, ScanLine, Swords, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NotificationBell } from "@/components/NotificationBell";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsSignedIn(!!session);
    if (session) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .single();
      
      setIsAdmin(!!data);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/auth");
  };

  const navItems = [
    { name: "Dashboard", path: "/", icon: Trophy },
    { name: "Players", path: "/players", icon: Users },
    { name: "Teams", path: "/teams", icon: Users },
    { name: "Matches", path: "/matches", icon: Swords },
    { name: "Best XI", path: "/best-xi", icon: Star },
    { name: "Leaderboards", path: "/leaderboards", icon: BarChart3 },
    { name: "Compare", path: "/compare", icon: GitCompare },
    { name: "Announcements", path: "/announcements", icon: Bell },
    { name: "AI Analyst", path: "/cricket-analyst", icon: Bot },
  ];

  if (isAdmin) {
    navItems.push({ name: "Admin", path: "/admin", icon: Shield });
    navItems.push({ name: "Scorecard OCR", path: "/scorecard-ocr", icon: ScanLine });
  }
  if (isSignedIn) {
    navItems.push({ name: "Change Password", path: "/change-password", icon: KeyRound });
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-12 md:h-16 items-center justify-between px-3 md:px-4">
        <Link to="/" className="flex items-center space-x-1.5 md:space-x-2">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-cricket rounded-full flex items-center justify-center">
            <Trophy className="w-4 h-4 md:w-6 md:h-6 text-white" />
          </div>
          <span className="font-bold text-base md:text-xl hidden sm:inline-block">Cricket Stats</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className="gap-1.5 text-sm h-9 px-3"
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
          <NotificationBell />
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-9 w-9">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center space-x-1">
          <NotificationBell />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <nav className="flex flex-col space-y-1.5 mt-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                  >
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className="w-full justify-start gap-2 h-11 text-base"
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 h-11 text-base"
                onClick={() => {
                  handleSignOut();
                  setIsOpen(false);
                }}
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;