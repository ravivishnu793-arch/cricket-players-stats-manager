import { motion, useReducedMotion } from "framer-motion";

interface PerformanceBarProps {
  label: string;
  value1: number;
  value2: number;
  player1Name: string;
  player2Name: string;
  higherIsBetter?: boolean;
}

export const PerformanceBar = ({ 
  label, 
  value1, 
  value2, 
  player1Name, 
  player2Name,
  higherIsBetter = true 
}: PerformanceBarProps) => {
  const prefersReducedMotion = useReducedMotion();
  const total = value1 + value2;
  const percentage1 = total > 0 ? (value1 / total) * 100 : 50;
  const percentage2 = total > 0 ? (value2 / total) * 100 : 50;

  const winner = value1 === value2 ? "tie" : 
                 higherIsBetter ? (value1 > value2 ? "player1" : "player2") :
                 (value1 < value2 ? "player1" : "player2");

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
      </div>
      
      <div className="relative h-12 bg-muted/30 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex">
          <motion.div
            className={`relative flex items-center justify-start px-4 ${
              winner === "player1" ? "bg-performance-excellent winner-glow-cyan" : "bg-primary/60"
            }`}
            initial={prefersReducedMotion ? false : { width: 0 }}
            animate={{ width: `${percentage1}%` }}
            transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 75, damping: 17, delay: 0.12 }}
          >
            <span className="text-foreground font-bold text-sm">{value1}</span>
            {winner === "player1" && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              />
            )}
          </motion.div>
          
          <motion.div
            className={`relative flex items-center justify-end px-4 ${
              winner === "player2" ? "bg-performance-excellent winner-glow-gold" : "bg-accent/60"
            }`}
            initial={prefersReducedMotion ? false : { width: 0 }}
            animate={{ width: `${percentage2}%` }}
            transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 75, damping: 17, delay: 0.12 }}
          >
            <span className="text-foreground font-bold text-sm">{value2}</span>
            {winner === "player2" && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-l from-transparent via-white/20 to-transparent"
                initial={{ x: "100%" }}
                animate={{ x: "-200%" }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              />
            )}
          </motion.div>
        </div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{player1Name}</span>
        <span>{player2Name}</span>
      </div>
    </div>
  );
};
