import { z } from 'zod';

// Batting stats validation
export const battingStatsSchema = z.object({
  innings: z.number().int().min(0, "Innings must be 0 or greater").max(10000, "Innings exceeds maximum limit"),
  runs: z.number().int().min(0, "Runs must be 0 or greater").max(1000000, "Runs exceeds maximum limit"),
  not_outs: z.number().int().min(0, "Not outs must be 0 or greater"),
  highest_score: z.number().int().min(0, "Highest score must be 0 or greater").max(1000, "Highest score exceeds maximum limit"),
  fours: z.number().int().min(0, "Fours must be 0 or greater").max(10000, "Fours exceeds maximum limit"),
  sixes: z.number().int().min(0, "Sixes must be 0 or greater").max(10000, "Sixes exceeds maximum limit")
}).refine(data => data.not_outs <= data.innings, {
  message: "Not outs cannot exceed innings",
  path: ["not_outs"]
});

// Bowling stats validation
export const bowlingStatsSchema = z.object({
  matches: z.number().int().min(0, "Matches must be 0 or greater").max(10000, "Matches exceeds maximum limit"),
  innings: z.number().int().min(0, "Innings must be 0 or greater").max(10000, "Innings exceeds maximum limit"),
  wickets: z.number().int().min(0, "Wickets must be 0 or greater").max(10000, "Wickets exceeds maximum limit"),
  runs_conceded: z.number().int().min(0, "Runs conceded must be 0 or greater").max(1000000, "Runs conceded exceeds maximum limit"),
  overs_bowled: z.number().min(0, "Overs bowled must be 0 or greater").max(10000, "Overs bowled exceeds maximum limit"),
  best_bowling: z.string().max(20, "Best bowling must be less than 20 characters").regex(/^(\d+\/\d+)?$/, "Best bowling must be in format '4/25' or empty"),
  three_wickets: z.number().int().min(0, "Three wickets must be 0 or greater").max(1000, "Three wickets exceeds maximum limit"),
  four_wickets: z.number().int().min(0, "Four wickets must be 0 or greater").max(1000, "Four wickets exceeds maximum limit")
});

// Player validation
export const playerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters").regex(/^[a-zA-Z\s.'-]+$/, "Name can only contain letters, spaces, dots, apostrophes, and hyphens"),
  role: z.enum(['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'], { errorMap: () => ({ message: "Role must be Batsman, Bowler, All-Rounder, or Wicket Keeper" }) }),
  matches_played: z.number().int().min(0, "Matches played must be 0 or greater").max(10000, "Matches played exceeds maximum limit")
});

// Team validation
export const teamSchema = z.object({
  name: z.string().trim().min(1, "Team name is required").max(100, "Team name must be less than 100 characters"),
  matches_played: z.number().int().min(0, "Matches played must be 0 or greater").max(10000, "Matches played exceeds maximum limit"),
  wins: z.number().int().min(0, "Wins must be 0 or greater"),
  losses: z.number().int().min(0, "Losses must be 0 or greater")
}).refine(data => data.wins + data.losses <= data.matches_played, {
  message: "Wins + losses cannot exceed matches played",
  path: ["wins"]
});

// Announcement validation
export const announcementSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().trim().min(1, "Description is required").max(2000, "Description must be less than 2000 characters"),
  announcement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
});

// File validation
export const fileSchema = z.object({
  size: z.number().max(5 * 1024 * 1024, "File size must be less than 5MB"),
  type: z.string().regex(/^image\/(jpeg|jpg|png|webp)$/, "File must be JPEG, PNG, or WebP format")
});

// Validation helper function
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  try {
    fileSchema.parse({ size: file.size, type: file.type });
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: "Invalid file" };
  }
};
