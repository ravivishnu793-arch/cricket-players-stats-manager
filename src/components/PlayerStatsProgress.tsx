import { Progress } from "@/components/ui/progress";

interface PlayerStatsProgressProps {
  label: string;
  value: number;
  maxValue: number;
  color?: "primary" | "accent" | "secondary";
}

export const PlayerStatsProgress = ({ 
  label, 
  value, 
  maxValue,
  color = "primary" 
}: PlayerStatsProgressProps) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  const colorClasses = {
    primary: "bg-primary",
    accent: "bg-accent",
    secondary: "bg-secondary"
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-glow">{value}</span>
      </div>
      <div className="relative">
        <Progress value={percentage} className="h-2" />
        <div 
          className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-1000 ease-out ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
