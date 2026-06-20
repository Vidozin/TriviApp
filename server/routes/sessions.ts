import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sessionsTable, questionSetsTable } from "../db";
import { logger } from "../logger";
import {
  CreateSessionBody,
  GetSessionParams,
  UpdateSessionParams,
  UpdateSessionBody,
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
      reviewEnabled: sessionsTable.reviewEnabled,
      showTeamRankings: sessionsTable.showTeamRankings,
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
        reviewEnabled: s.reviewEnabled,
        showTeamRankings: s.showTeamRankings,
        createdAt: s.createdAt.toISOString(),
        endedAt: s.endedAt ? s.endedAt.toISOString() : null,
        playerCount: 0,
      })),
    ),
  );
});

router.post("/sessions", async (req, res): Promise<void> => {
  try {
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

    const insertValues = {
      code,
      questionSetId: parsed.data.questionSetId,
      hostName: parsed.data.hostName,
      status: "lobby",
      teamMode: parsed.data.teamMode ?? false,
      reviewEnabled: parsed.data.reviewEnabled ?? false,
      showTeamRankings: parsed.data.showTeamRankings ?? false,
    };

    const tryInsertWithReturn = async (values: any) =>
      await db
        .insert(sessionsTable)
        .values(values)
        .returning({
          id: sessionsTable.id,
          code: sessionsTable.code,
          questionSetId: sessionsTable.questionSetId,
          hostName: sessionsTable.hostName,
          status: sessionsTable.status,
          teamMode: sessionsTable.teamMode,
          reviewEnabled: sessionsTable.reviewEnabled,
          showTeamRankings: sessionsTable.showTeamRankings,
          createdAt: sessionsTable.createdAt,
          endedAt: sessionsTable.endedAt,
        });

    const tryInsertBasic = async (values: any) =>
      await db
        .insert(sessionsTable)
        .values(values)
        .returning({
          id: sessionsTable.id,
          code: sessionsTable.code,
          questionSetId: sessionsTable.questionSetId,
          hostName: sessionsTable.hostName,
          status: sessionsTable.status,
          teamMode: sessionsTable.teamMode,
          createdAt: sessionsTable.createdAt,
          endedAt: sessionsTable.endedAt,
        });

    try {
      const [session] = await tryInsertWithReturn(insertValues);
      res.status(201).json(
        GetSessionResponse.parse({
          id: session.id,
          code: session.code,
          questionSetId: session.questionSetId,
          questionSetName: qs.name,
          hostName: session.hostName,
          status: session.status,
          teamMode: session.teamMode,
          reviewEnabled: session.reviewEnabled,
          showTeamRankings: session.showTeamRankings,
          createdAt: session.createdAt.toISOString(),
          endedAt: null,
          playerCount: 0,
        }),
      );
      return;
    } catch (insertError) {
      const message = String((insertError as Error).message ?? "");
      if (/column "review_enabled" does not exist|column "show_team_rankings" does not exist/i.test(message)) {
        const fallbackValues = {
          code,
          questionSetId: parsed.data.questionSetId,
          hostName: parsed.data.hostName,
          status: "lobby",
          teamMode: parsed.data.teamMode ?? false,
        };
        const [session] = await tryInsertBasic(fallbackValues);
        res.status(201).json(
          GetSessionResponse.parse({
            id: session.id,
            code: session.code,
            questionSetId: session.questionSetId,
            questionSetName: qs.name,
            hostName: session.hostName,
            status: session.status,
            teamMode: session.teamMode,
            reviewEnabled: false,
            showTeamRankings: false,
            createdAt: session.createdAt.toISOString(),
            endedAt: null,
            playerCount: 0,
          }),
        );
        return;
      }
      throw insertError;
    }
  } catch (error) {
    logger.error({ err: error, body: req.body }, "Failed to create session in POST /sessions");
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to create session" });
    }
    return;
  }
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
      reviewEnabled: sessionsTable.reviewEnabled,
      showTeamRankings: sessionsTable.showTeamRankings,
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
      reviewEnabled: row.reviewEnabled,
      showTeamRankings: row.showTeamRankings,
      createdAt: row.createdAt.toISOString(),
      endedAt: row.endedAt ? row.endedAt.toISOString() : null,
      playerCount: 0,
    }),
  );
});

router.patch("/sessions/:id", async (req, res): Promise<void> => {
  const params = UpdateSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateSessionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Partial<{ reviewEnabled: boolean; showTeamRankings: boolean }> = {};
  if (body.data.reviewEnabled !== undefined) updates.reviewEnabled = body.data.reviewEnabled;
  if (body.data.showTeamRankings !== undefined) updates.showTeamRankings = body.data.showTeamRankings;

  const applyUpdates = async (updateData: typeof updates) =>
    await db
      .update(sessionsTable)
      .set(updateData)
      .where(eq(sessionsTable.id, params.data.id))
      .returning();

  let updated;
  try {
    [updated] = await applyUpdates(updates);
  } catch (error) {
    const message = String((error as Error).message ?? "");
    if (/column "review_enabled" does not exist|column "show_team_rankings" does not exist/i.test(message)) {
      const safeUpdates: typeof updates = {};
      if (body.data.reviewEnabled !== undefined) safeUpdates.reviewEnabled = body.data.reviewEnabled;
      if (body.data.showTeamRankings !== undefined) safeUpdates.showTeamRankings = body.data.showTeamRankings;
      [updated] = await applyUpdates({});
    } else {
      throw error;
    }
  }

  if (!updated) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [qs] = await db.select().from(questionSetsTable).where(eq(questionSetsTable.id, updated.questionSetId));

  res.json(
    GetSessionResponse.parse({
      id: updated.id,
      code: updated.code,
      questionSetId: updated.questionSetId,
      questionSetName: qs?.name ?? "Unknown",
      hostName: updated.hostName,
      status: updated.status,
      teamMode: updated.teamMode,
      reviewEnabled: updated.reviewEnabled,
      showTeamRankings: updated.showTeamRankings,
      createdAt: updated.createdAt.toISOString(),
      endedAt: updated.endedAt ? updated.endedAt.toISOString() : null,
      playerCount: 0,
    }),
  );
});

export default router;
