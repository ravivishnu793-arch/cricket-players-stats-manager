import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface TeamStatsChartProps {
  wins: number;
  losses: number;
  teamColor: string;
}

export const TeamStatsChart = ({ wins, losses, teamColor }: TeamStatsChartProps) => {
  const data = [
    { name: "Wins", value: wins },
    { name: "Losses", value: losses },
  ];

  const COLORS = [teamColor, "hsl(var(--destructive))"];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
          label
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px"
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
