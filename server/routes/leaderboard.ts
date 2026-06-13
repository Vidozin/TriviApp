import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, leaderboardTable, sessionsTable, questionSetsTable } from "../db";
import { GetLeaderboardResponse, GetLeaderboardStatsResponse, SaveLeaderboardBody, SaveLeaderboardResponse } from "../validators";

const router: IRouter = Router();

const leaderboardSelect = () =>
  db
    .select({
      id: leaderboardTable.id,
      playerName: leaderboardTable.playerName,
      teamName: leaderboardTable.teamName,
      score: leaderboardTable.score,
      correctAnswers: leaderboardTable.correctAnswers,
      totalQuestions: leaderboardTable.totalQuestions,
      sessionId: leaderboardTable.sessionId,
      questionSetName: questionSetsTable.name,
      playedAt: leaderboardTable.playedAt,
    })
    .from(leaderboardTable)
    .leftJoin(sessionsTable, eq(leaderboardTable.sessionId, sessionsTable.id))
    .leftJoin(questionSetsTable, eq(sessionsTable.questionSetId, questionSetsTable.id));

router.get("/leaderboard", async (req, res): Promise<void> => {
  const rawSessionId = req.query.sessionId;
  const sessionId = rawSessionId ? parseInt(rawSessionId as string, 10) : undefined;

  const rows = await (sessionId
    ? leaderboardSelect().where(eq(leaderboardTable.sessionId, sessionId))
    : leaderboardSelect()
  )
    .orderBy(desc(leaderboardTable.score))
    .limit(200);

  res.json(
    GetLeaderboardResponse.parse(
      rows.map((r) => ({
        id: r.id,
        playerName: r.playerName,
        teamName: r.teamName,
        score: r.score,
        correctAnswers: r.correctAnswers,
        totalQuestions: r.totalQuestions,
        sessionId: r.sessionId,
        questionSetName: r.questionSetName ?? "Unknown",
        playedAt: r.playedAt.toISOString(),
      })),
    ),
  );
});

router.get("/leaderboard/stats", async (_req, res): Promise<void> => {
  const topPlayers = await db
    .select({
      id: leaderboardTable.id,
      playerName: leaderboardTable.playerName,
      teamName: leaderboardTable.teamName,
      score: leaderboardTable.score,
      correctAnswers: leaderboardTable.correctAnswers,
      totalQuestions: leaderboardTable.totalQuestions,
      sessionId: leaderboardTable.sessionId,
      questionSetName: questionSetsTable.name,
      playedAt: leaderboardTable.playedAt,
    })
    .from(leaderboardTable)
    .leftJoin(sessionsTable, eq(leaderboardTable.sessionId, sessionsTable.id))
    .leftJoin(questionSetsTable, eq(sessionsTable.questionSetId, questionSetsTable.id))
    .orderBy(desc(leaderboardTable.score))
    .limit(10);

  const [sessionCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessionsTable);

  const [playerCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leaderboardTable);

  const [mostPlayed] = await db
    .select({
      name: questionSetsTable.name,
      count: sql<number>`count(*)::int`,
    })
    .from(sessionsTable)
    .leftJoin(questionSetsTable, eq(sessionsTable.questionSetId, questionSetsTable.id))
    .groupBy(questionSetsTable.name)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  res.json(
    GetLeaderboardStatsResponse.parse({
      topPlayers: topPlayers.map((r) => ({
        id: r.id,
        playerName: r.playerName,
        teamName: r.teamName,
        score: r.score,
        correctAnswers: r.correctAnswers,
        totalQuestions: r.totalQuestions,
        sessionId: r.sessionId,
        questionSetName: r.questionSetName ?? "Unknown",
        playedAt: r.playedAt.toISOString(),
      })),
      totalSessions: sessionCount?.count ?? 0,
      totalPlayers: playerCount?.count ?? 0,
      mostPlayedSet: mostPlayed?.name ?? null,
    }),
  );
});

router.post("/leaderboard", async (req, res): Promise<void> => {
  const parsed = SaveLeaderboardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sessionId, players } = parsed.data;

  const [session] = await db
    .select({ id: sessionsTable.id })
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const toInsert = players.map((p) => ({
    playerName: p.playerName,
    teamName: p.teamName ?? null,
    score: p.score,
    correctAnswers: p.correctAnswers,
    totalQuestions: p.totalQuestions,
    sessionId,
  }));

  const inserted = await db
    .insert(leaderboardTable)
    .values(toInsert)
    .onConflictDoNothing()
    .returning({ id: leaderboardTable.id });

  res.status(201).json(SaveLeaderboardResponse.parse({ saved: inserted.length }));
});

export default router;
