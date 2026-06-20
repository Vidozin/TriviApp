import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { questionSetsTable } from "./question-sets";

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  questionSetId: integer("question_set_id").notNull().references(() => questionSetsTable.id),
  hostName: text("host_name").notNull(),
  status: text("status").notNull().default("lobby"),
  teamMode: boolean("team_mode").notNull().default(false),
  reviewEnabled: boolean("review_enabled").notNull().default(false),
  showTeamRankings: boolean("show_team_rankings").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, createdAt: true, endedAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
