import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import questionSetsRouter from "./question-sets";
import sessionsRouter from "./sessions";
import leaderboardRouter from "./leaderboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(questionSetsRouter);
router.use(sessionsRouter);
router.use(leaderboardRouter);

export default router;
