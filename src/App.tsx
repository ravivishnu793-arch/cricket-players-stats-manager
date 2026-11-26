import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import { RealtimeNotifications } from "@/components/RealtimeNotifications";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Players from "./pages/Players";
import Teams from "./pages/Teams";
import Leaderboards from "./pages/Leaderboards";
import Compare from "./pages/Compare";
import Announcements from "./pages/Announcements";
import ScorecardOCR from "./pages/ScorecardOCR";
import CricketAnalyst from "./pages/CricketAnalyst";
import NotFound from "./pages/NotFound";
import Matches from "./pages/Matches";
import BestXI from "./pages/BestXI";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
      >
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/players" element={<Players />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/best-xi" element={<BestXI />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/scorecard-ocr" element={<ScorecardOCR />} />
          <Route path="/cricket-analyst" element={<CricketAnalyst />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RealtimeNotifications />
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;