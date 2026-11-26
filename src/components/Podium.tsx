import { motion, useReducedMotion } from "framer-motion";
import { Trophy, Award, Medal } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";

const particles = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  top: `${8 + ((index * 37) % 84)}%`,
  left: `${5 + ((index * 53) % 90)}%`,
  rotate: index * 47,
  delay: (index % 6) * 0.05,
}));

interface PodiumProps {
  topThree: any[];
  type: "batting" | "bowling";
}

export const Podium = ({ topThree, type }: PodiumProps) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const leaderId = topThree[0]?.id;

  useEffect(() => {
    setShowConfetti(false);
    if (!leaderId || prefersReducedMotion) return;
    const timer = window.setTimeout(() => setShowConfetti(true), 500);
    return () => window.clearTimeout(timer);
  }, [leaderId, prefersReducedMotion]);

  const positions = [
    { rank: 2, height: "h-32", delay: 0.2, color: "from-slate-400 to-slate-500" },
    { rank: 1, height: "h-48", delay: 0, color: "from-yellow-400 to-yellow-600" },
    { rank: 3, height: "h-24", delay: 0.4, color: "from-orange-400 to-orange-600" },
  ];

  const orderedPlayers = topThree.length >= 3 ? [topThree[1], topThree[0], topThree[2]] : [];

  return (
    <div className="relative">
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              aria-hidden="true"
              className="absolute h-2 w-2 rounded-full bg-performance-average shadow-cyan"
              initial={{ 
                top: "50%", 
                left: "50%",
                scale: 0,
                opacity: 1 
              }}
              animate={{ 
                top: particle.top,
                left: particle.left,
                scale: [0, 1, 0],
                opacity: [1, 1, 0],
                rotate: particle.rotate
              }}
              transition={{ 
                duration: 2,
                delay: particle.delay,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
      )}

      <div className="flex items-end justify-center gap-4 mb-8">
        {orderedPlayers.map((player, idx) => {
          const position = positions[idx];
          const Icon = position.rank === 1 ? Trophy : position.rank === 2 ? Award : Medal;
          const stat = type === "batting" ? player?.runs : player?.wickets;

          return (
            <motion.div
              key={player?.id || idx}
              className="flex flex-col items-center gap-3"
              initial={prefersReducedMotion ? false : { y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 110, damping: 16, delay: position.delay }}
            >
              <div className="relative text-center space-y-2">
                {position.rank === 1 && showConfetti && (
                  <motion.div
                    aria-hidden="true"
                    className="absolute left-1/2 top-8 -z-10 h-28 w-28 -translate-x-1/2 rounded-full bg-performance-average/25 blur-2xl"
                    animate={prefersReducedMotion ? undefined : { scale: [0.85, 1.15, 0.85], opacity: [0.45, 0.8, 0.45] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <Avatar className="w-16 h-16 mx-auto border-4 border-background shadow-lg">
                  <AvatarImage src={player?.players?.profile_photo_url} />
                  <AvatarFallback className="bg-gradient-cyan text-white">
                    {player?.players?.name.split(" ").map((n: string) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <p className="font-bold text-sm">{player?.players?.name}</p>
                <p className="text-2xl font-bold text-glow">{stat}</p>
              </div>

              <motion.div
                className={`${position.height} w-32 bg-gradient-to-t ${position.color} rounded-t-lg flex flex-col items-center justify-start pt-4 shadow-cyan-lg relative overflow-hidden`}
                initial={{ height: 0 }}
                animate={{ height: position.height.replace("h-", "") === "48" ? "12rem" : position.height.replace("h-", "") === "32" ? "8rem" : "6rem" }}
                transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 100, damping: 15, delay: position.delay + 0.15 }}
              >
                <Icon className="w-8 h-8 text-white drop-shadow-lg" />
                <p className="text-white font-bold text-3xl mt-2">#{position.rank}</p>
                
                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ 
                    duration: 1.5, 
                    delay: position.delay + 0.5,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                />
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
