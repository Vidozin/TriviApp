import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const questionSetsTable = pgTable("question_sets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  questionSetId: integer("question_set_id").notNull().references(() => questionSetsTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  questionType: text("question_type").notNull().default("multiple_choice"),
  options: text("options").array().notNull().default([]),
  correctAnswer: text("correct_answer").notNull(),
  category: text("category"),
  difficulty: text("difficulty").notNull().default("medium"),
  points: integer("points").notNull().default(100),
  timeLimitSeconds: integer("time_limit_seconds").notNull().default(30),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuestionSetSchema = createInsertSchema(questionSetsTable).omit({ id: true, createdAt: true });
export type InsertQuestionSet = z.infer<typeof insertQuestionSetSchema>;
export type QuestionSet = typeof questionSetsTable.$inferSelect;

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;
