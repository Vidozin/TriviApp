import { z } from "zod";

export const HostLoginBody = z.object({ password: z.string().min(1) });
export const HostLoginResponse = z.object({ authenticated: z.boolean() });
export const GetAuthStatusResponse = z.object({ authenticated: z.boolean() });

export const CreateQuestionSetBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
});

export const GetQuestionSetParams = z.object({ id: z.coerce.number() });
export const DeleteQuestionSetParams = z.object({ id: z.coerce.number() });
export const AddQuestionsToSetParams = z.object({ id: z.coerce.number() });

export const QuestionInputSchema = z.object({
  text: z.string().min(1),
  questionType: z.enum(["multiple_choice", "true_false", "open"]).optional(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string(),
  category: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  points: z.number().optional(),
  timeLimitSeconds: z.number().optional(),
  orderIndex: z.number().optional(),
});

export const AddQuestionsToSetBody = z.object({
  questions: z.array(QuestionInputSchema),
});

export const CreateSessionBody = z.object({
  questionSetId: z.number(),
  hostName: z.string(),
  teamMode: z.boolean().optional(),
});

export const GetSessionParams = z.object({ id: z.coerce.number() });

const LeaderboardEntrySchema = z.object({
  id: z.number(),
  playerName: z.string(),
  teamName: z.string().nullish(),
  score: z.number(),
  correctAnswers: z.number(),
  totalQuestions: z.number(),
  sessionId: z.number(),
  questionSetName: z.string(),
  playedAt: z.string(),
});

export const GetLeaderboardResponse = z.array(LeaderboardEntrySchema);

export const GetLeaderboardStatsResponse = z.object({
  topPlayers: z.array(LeaderboardEntrySchema),
  totalSessions: z.number(),
  totalPlayers: z.number(),
  mostPlayedSet: z.string().nullish(),
});

export const ListQuestionSetsResponse = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullish(),
    category: z.string().nullish(),
    questionCount: z.number(),
    createdAt: z.string(),
  }),
);

export const GetQuestionSetResponse = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullish(),
  category: z.string().nullish(),
  createdAt: z.string(),
  questions: z.array(
    z.object({
      id: z.number(),
      questionSetId: z.number(),
      text: z.string(),
      questionType: z.enum(["multiple_choice", "true_false", "open"]),
      options: z.array(z.string()),
      correctAnswer: z.string(),
      category: z.string().nullish(),
      difficulty: z.enum(["easy", "medium", "hard"]),
      points: z.number(),
      timeLimitSeconds: z.number(),
      orderIndex: z.number(),
    }),
  ),
});

export const SaveLeaderboardPlayerSchema = z.object({
  playerName: z.string().min(1),
  teamName: z.string().optional().nullable(),
  score: z.number().int().min(0),
  correctAnswers: z.number().int().min(0),
  totalQuestions: z.number().int().min(0),
});

export const SaveLeaderboardBody = z.object({
  sessionId: z.number().int(),
  players: z.array(SaveLeaderboardPlayerSchema).min(1),
});

export const SaveLeaderboardResponse = z.object({
  saved: z.number(),
});

export const ListSessionsResponse = z.array(
  z.object({
    id: z.number(),
    code: z.string(),
    questionSetId: z.number(),
    questionSetName: z.string(),
    hostName: z.string(),
    status: z.string(),
    teamMode: z.boolean(),
    createdAt: z.string(),
    endedAt: z.string().nullish(),
    playerCount: z.number(),
  }),
);

export const GetSessionResponse = z.object({
  id: z.number(),
  code: z.string(),
  questionSetId: z.number(),
  questionSetName: z.string(),
  hostName: z.string(),
  status: z.string(),
  teamMode: z.boolean(),
  createdAt: z.string(),
  endedAt: z.string().nullish(),
  playerCount: z.number(),
});
