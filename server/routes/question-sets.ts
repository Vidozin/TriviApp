import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, questionSetsTable, questionsTable } from "../db";
import {
  CreateQuestionSetBody,
  GetQuestionSetParams,
  DeleteQuestionSetParams,
  AddQuestionsToSetParams,
  AddQuestionsToSetBody,
  ListQuestionSetsResponse,
  GetQuestionSetResponse,
} from "../validators";

const router: IRouter = Router();

router.get("/question-sets", async (_req, res): Promise<void> => {
  const sets = await db
    .select({
      id: questionSetsTable.id,
      name: questionSetsTable.name,
      description: questionSetsTable.description,
      category: questionSetsTable.category,
      createdAt: questionSetsTable.createdAt,
      questionCount: sql<number>`(select count(*) from questions where questions.question_set_id = ${questionSetsTable.id})::int`,
    })
    .from(questionSetsTable)
    .orderBy(questionSetsTable.createdAt);

  res.json(ListQuestionSetsResponse.parse(sets.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }))));
});

router.post("/question-sets", async (req, res): Promise<void> => {
  const parsed = CreateQuestionSetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [qs] = await db.insert(questionSetsTable).values(parsed.data).returning();

  res.status(201).json({
    id: qs.id,
    name: qs.name,
    description: qs.description,
    category: qs.category,
    createdAt: qs.createdAt.toISOString(),
    questionCount: 0,
  });
});

router.get("/question-sets/:id", async (req, res): Promise<void> => {
  const params = GetQuestionSetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [qs] = await db.select().from(questionSetsTable).where(eq(questionSetsTable.id, params.data.id));

  if (!qs) {
    res.status(404).json({ error: "Question set not found" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.questionSetId, params.data.id))
    .orderBy(questionsTable.orderIndex);

  res.json(
    GetQuestionSetResponse.parse({
      id: qs.id,
      name: qs.name,
      description: qs.description,
      category: qs.category,
      createdAt: qs.createdAt.toISOString(),
      questions: questions.map((q) => ({
        id: q.id,
        questionSetId: q.questionSetId,
        text: q.text,
        questionType: q.questionType,
        options: q.options,
        correctAnswer: q.correctAnswer,
        category: q.category,
        difficulty: q.difficulty,
        points: q.points,
        timeLimitSeconds: q.timeLimitSeconds,
        orderIndex: q.orderIndex,
      })),
    }),
  );
});

router.delete("/question-sets/:id", async (req, res): Promise<void> => {
  const params = DeleteQuestionSetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(questionSetsTable).where(eq(questionSetsTable.id, params.data.id)).returning();

  if (!deleted) {
    res.status(404).json({ error: "Question set not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/question-sets/:id/questions", async (req, res): Promise<void> => {
  const params = AddQuestionsToSetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AddQuestionsToSetBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [qs] = await db.select().from(questionSetsTable).where(eq(questionSetsTable.id, params.data.id));

  if (!qs) {
    res.status(404).json({ error: "Question set not found" });
    return;
  }

  const existing = await db
    .select({ orderIndex: questionsTable.orderIndex })
    .from(questionsTable)
    .where(eq(questionsTable.questionSetId, params.data.id));

  const baseIndex = existing.length;

  const toInsert = body.data.questions.map((q, i) => {
    const qType = q.questionType ?? "multiple_choice";
    let options: string[] = q.options ?? [];

    if (qType === "true_false") options = ["True", "False"];
    if (qType === "open") options = [];

    return {
      questionSetId: params.data.id,
      text: q.text,
      questionType: qType,
      options,
      correctAnswer: q.correctAnswer,
      category: q.category ?? null,
      difficulty: q.difficulty ?? "medium",
      points: q.points ?? 100,
      timeLimitSeconds: q.timeLimitSeconds ?? 30,
      orderIndex: q.orderIndex ?? baseIndex + i,
    };
  });

  const inserted = await db.insert(questionsTable).values(toInsert).returning();

  res.status(201).json(
    inserted.map((q) => ({
      id: q.id,
      questionSetId: q.questionSetId,
      text: q.text,
      questionType: q.questionType,
      options: q.options,
      correctAnswer: q.correctAnswer,
      category: q.category,
      difficulty: q.difficulty,
      points: q.points,
      timeLimitSeconds: q.timeLimitSeconds,
      orderIndex: q.orderIndex,
    })),
  );
});

export default router;
