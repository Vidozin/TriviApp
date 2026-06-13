import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sessionsTable } from "./sessions";

export const leaderboardTable = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  teamName: text("team_name"),
  score: integer("score").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  totalQuestions: integer("total_questions").notNull().default(0),
  sessionId: integer("session_id").notNull().references(() => sessionsTable.id),
  playedAt: timestamp("played_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLeaderboardSchema = createInsertSchema(leaderboardTable).omit({ id: true, playedAt: true });
export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;
export type LeaderboardEntry = typeof leaderboardTable.$inferSelect;
