import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sessionsTable, questionSetsTable } from "../db";
import {
  CreateSessionBody,
  GetSessionParams,
  ListSessionsResponse,
  GetSessionResponse,
} from "../validators";

const router: IRouter = Router();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

router.get("/sessions", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: sessionsTable.id,
      code: sessionsTable.code,
      questionSetId: sessionsTable.questionSetId,
      questionSetName: questionSetsTable.name,
      hostName: sessionsTable.hostName,
      status: sessionsTable.status,
      teamMode: sessionsTable.teamMode,
      createdAt: sessionsTable.createdAt,
      endedAt: sessionsTable.endedAt,
    })
    .from(sessionsTable)
    .leftJoin(questionSetsTable, eq(sessionsTable.questionSetId, questionSetsTable.id))
    .orderBy(sessionsTable.createdAt);

  res.json(
    ListSessionsResponse.parse(
      rows.map((s) => ({
        id: s.id,
        code: s.code,
        questionSetId: s.questionSetId,
        questionSetName: s.questionSetName ?? "Unknown",
        hostName: s.hostName,
        status: s.status,
        teamMode: s.teamMode,
        createdAt: s.createdAt.toISOString(),
        endedAt: s.endedAt ? s.endedAt.toISOString() : null,
        playerCount: 0,
      })),
    ),
  );
});

router.post("/sessions", async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [qs] = await db.select().from(questionSetsTable).where(eq(questionSetsTable.id, parsed.data.questionSetId));

  if (!qs) {
    res.status(404).json({ error: "Question set not found" });
    return;
  }

  let code = generateCode();
  let attempts = 0;
  while (attempts < 10) {
    const [existing] = await db.select().from(sessionsTable).where(eq(sessionsTable.code, code));
    if (!existing) break;
    code = generateCode();
    attempts++;
  }

  const [session] = await db
    .insert(sessionsTable)
    .values({
      code,
      questionSetId: parsed.data.questionSetId,
      hostName: parsed.data.hostName,
      status: "lobby",
      teamMode: parsed.data.teamMode ?? false,
    })
    .returning();

  res.status(201).json(
    GetSessionResponse.parse({
      id: session.id,
      code: session.code,
      questionSetId: session.questionSetId,
      questionSetName: qs.name,
      hostName: session.hostName,
      status: session.status,
      teamMode: session.teamMode,
      createdAt: session.createdAt.toISOString(),
      endedAt: null,
      playerCount: 0,
    }),
  );
});

router.get("/sessions/:id", async (req, res): Promise<void> => {
  const params = GetSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      id: sessionsTable.id,
      code: sessionsTable.code,
      questionSetId: sessionsTable.questionSetId,
      questionSetName: questionSetsTable.name,
      hostName: sessionsTable.hostName,
      status: sessionsTable.status,
      teamMode: sessionsTable.teamMode,
      createdAt: sessionsTable.createdAt,
      endedAt: sessionsTable.endedAt,
    })
    .from(sessionsTable)
    .leftJoin(questionSetsTable, eq(sessionsTable.questionSetId, questionSetsTable.id))
    .where(eq(sessionsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(
    GetSessionResponse.parse({
      id: row.id,
      code: row.code,
      questionSetId: row.questionSetId,
      questionSetName: row.questionSetName ?? "Unknown",
      hostName: row.hostName,
      status: row.status,
      teamMode: row.teamMode,
      createdAt: row.createdAt.toISOString(),
      endedAt: row.endedAt ? row.endedAt.toISOString() : null,
      playerCount: 0,
    }),
  );
});

export default router;
