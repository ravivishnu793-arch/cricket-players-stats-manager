import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface RadarChartProps {
  player1Data: any;
  player2Data: any;
  player1Name: string;
  player2Name: string;
}

export const RadarChart = ({ player1Data, player2Data, player1Name, player2Name }: RadarChartProps) => {
  const normalizeValue = (value: number, max: number) => {
    return Math.min((value / max) * 100, 100);
  };

  // Find max values for normalization
  const maxRuns = Math.max(player1Data.batting?.runs || 0, player2Data.batting?.runs || 0);
  const maxWickets = Math.max(player1Data.bowling?.wickets || 0, player2Data.bowling?.wickets || 0);
  const maxFours = Math.max(player1Data.batting?.fours || 0, player2Data.batting?.fours || 0);
  const maxSixes = Math.max(player1Data.batting?.sixes || 0, player2Data.batting?.sixes || 0);
  const maxMatches = Math.max(player1Data.matches_played || 0, player2Data.matches_played || 0);

  const data = [
    {
      subject: 'Runs',
      [player1Name]: normalizeValue(player1Data.batting?.runs || 0, maxRuns),
      [player2Name]: normalizeValue(player2Data.batting?.runs || 0, maxRuns),
      fullMark: 100,
    },
    {
      subject: 'Wickets',
      [player1Name]: normalizeValue(player1Data.bowling?.wickets || 0, maxWickets),
      [player2Name]: normalizeValue(player2Data.bowling?.wickets || 0, maxWickets),
      fullMark: 100,
    },
    {
      subject: 'Fours',
      [player1Name]: normalizeValue(player1Data.batting?.fours || 0, maxFours),
      [player2Name]: normalizeValue(player2Data.batting?.fours || 0, maxFours),
      fullMark: 100,
    },
    {
      subject: 'Sixes',
      [player1Name]: normalizeValue(player1Data.batting?.sixes || 0, maxSixes),
      [player2Name]: normalizeValue(player2Data.batting?.sixes || 0, maxSixes),
      fullMark: 100,
    },
    {
      subject: 'Matches',
      [player1Name]: normalizeValue(player1Data.matches_played || 0, maxMatches),
      [player2Name]: normalizeValue(player2Data.matches_played || 0, maxMatches),
      fullMark: 100,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsRadar data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis 
          dataKey="subject" 
          tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
        />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
        <Radar 
          name={player1Name} 
          dataKey={player1Name} 
          stroke="hsl(var(--primary))" 
          fill="hsl(var(--primary))" 
          fillOpacity={0.5}
          strokeWidth={2}
        />
        <Radar 
          name={player2Name} 
          dataKey={player2Name} 
          stroke="hsl(var(--accent))" 
          fill="hsl(var(--accent))" 
          fillOpacity={0.5}
          strokeWidth={2}
        />
        <Legend wrapperStyle={{ paddingTop: "20px" }} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px"
          }}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  );
};
