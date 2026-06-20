import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions, type QueryKey } from "@tanstack/react-query";

export interface AuthStatus {
  authenticated: boolean;
}

export interface QuestionSet {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  questionCount: number;
  createdAt: string;
}

export interface Question {
  id: number;
  questionSetId: number;
  text: string;
  questionType: "multiple_choice" | "true_false" | "open";
  options: string[];
  correctAnswer: string;
  category?: string | null;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  timeLimitSeconds: number;
  orderIndex: number;
}

export interface QuestionSetDetail {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  createdAt: string;
  questions: Question[];
}

export interface QuestionInput {
  text: string;
  questionType?: "multiple_choice" | "true_false" | "open";
  options?: string[];
  correctAnswer: string;
  category?: string;
  difficulty?: "easy" | "medium" | "hard";
  points?: number;
  timeLimitSeconds?: number;
  orderIndex?: number;
}

export interface Session {
  id: number;
  code: string;
  questionSetId: number;
  questionSetName: string;
  hostName: string;
  status: string;
  teamMode: boolean;
  reviewEnabled: boolean;
  showTeamRankings: boolean;
  createdAt: string;
  endedAt?: string | null;
  playerCount: number;
}

export interface LeaderboardEntry {
  id: number;
  playerName: string;
  teamName?: string | null;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  sessionId: number;
  questionSetName: string;
  playedAt: string;
}

export interface LeaderboardStats {
  topPlayers: LeaderboardEntry[];
  totalSessions: number;
  totalPlayers: number;
  mostPlayedSet?: string | null;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export const getGetAuthStatusQueryKey = () => ["/api/auth/me"] as const;

export function useGetAuthStatus(options?: { query?: UseQueryOptions<AuthStatus, Error> }) {
  return useQuery<AuthStatus, Error>({
    queryKey: getGetAuthStatusQueryKey(),
    queryFn: ({ signal }) => apiFetch<AuthStatus>("/api/auth/me", { signal }),
    ...options?.query,
  });
}

export function useHostLogin(options?: { mutation?: UseMutationOptions<AuthStatus, Error, { data: { password: string } }> }) {
  return useMutation<AuthStatus, Error, { data: { password: string } }>({
    mutationFn: ({ data }) =>
      apiFetch<AuthStatus>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ...options?.mutation,
  });
}

export function useHostLogout(options?: { mutation?: UseMutationOptions<AuthStatus, Error, void> }) {
  return useMutation<AuthStatus, Error, void>({
    mutationFn: () =>
      apiFetch<AuthStatus>("/api/auth/logout", { method: "POST" }),
    ...options?.mutation,
  });
}

// ─── Question Sets ───────────────────────────────────────────────────────────

export const getListQuestionSetsQueryKey = () => ["/api/question-sets"] as const;

export function useListQuestionSets(options?: { query?: UseQueryOptions<QuestionSet[], Error> }) {
  return useQuery<QuestionSet[], Error>({
    queryKey: getListQuestionSetsQueryKey(),
    queryFn: ({ signal }) => apiFetch<QuestionSet[]>("/api/question-sets", { signal }),
    ...options?.query,
  });
}

export function useCreateQuestionSet(options?: {
  mutation?: UseMutationOptions<QuestionSet, Error, { data: { name: string; description?: string; category?: string } }>;
}) {
  return useMutation<QuestionSet, Error, { data: { name: string; description?: string; category?: string } }>({
    mutationFn: ({ data }) =>
      apiFetch<QuestionSet>("/api/question-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ...options?.mutation,
  });
}

export function useDeleteQuestionSet(options?: { mutation?: UseMutationOptions<void, Error, { id: number }> }) {
  return useMutation<void, Error, { id: number }>({
    mutationFn: ({ id }) => apiFetch<void>(`/api/question-sets/${id}`, { method: "DELETE" }),
    ...options?.mutation,
  });
}

export const getGetQuestionSetQueryKey = (id: number) => [`/api/question-sets/${id}`] as const;

export function useGetQuestionSet(
  id: number,
  options?: { query?: UseQueryOptions<QuestionSetDetail, Error> },
) {
  return useQuery<QuestionSetDetail, Error>({
    queryKey: getGetQuestionSetQueryKey(id),
    queryFn: ({ signal }) => apiFetch<QuestionSetDetail>(`/api/question-sets/${id}`, { signal }),
    enabled: !!id,
    ...options?.query,
  });
}

export function useAddQuestionsToSet(options?: {
  mutation?: UseMutationOptions<Question[], Error, { id: number; data: { questions: QuestionInput[] } }>;
}) {
  return useMutation<Question[], Error, { id: number; data: { questions: QuestionInput[] } }>({
    mutationFn: ({ id, data }) =>
      apiFetch<Question[]>(`/api/question-sets/${id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ...options?.mutation,
  });
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export const getListSessionsQueryKey = () => ["/api/sessions"] as const;

export function useListSessions(options?: { query?: UseQueryOptions<Session[], Error> }) {
  return useQuery<Session[], Error>({
    queryKey: getListSessionsQueryKey(),
    queryFn: ({ signal }) => apiFetch<Session[]>("/api/sessions", { signal }),
    ...options?.query,
  });
}

export function useCreateSession(options?: {
  mutation?: UseMutationOptions<Session, Error, { data: { questionSetId: number; hostName: string; teamMode?: boolean; reviewEnabled?: boolean; showTeamRankings?: boolean } }>;
}) {
  return useMutation<Session, Error, { data: { questionSetId: number; hostName: string; teamMode?: boolean; reviewEnabled?: boolean; showTeamRankings?: boolean } }>({
    mutationFn: ({ data }) =>
      apiFetch<Session>("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ...options?.mutation,
  });
}

export const getGetSessionQueryKey = (id: number) => [`/api/sessions/${id}`] as const;

export function useGetSession(
  id: number,
  options?: { query?: UseQueryOptions<Session, Error> },
) {
  return useQuery<Session, Error>({
    queryKey: getGetSessionQueryKey(id),
    queryFn: ({ signal }) => apiFetch<Session>(`/api/sessions/${id}`, { signal }),
    enabled: !!id,
    ...options?.query,
  });
}

export function useUpdateSession(options?: {
  mutation?: UseMutationOptions<Session, Error, { id: number; data: { reviewEnabled?: boolean; showTeamRankings?: boolean } }>;
}) {
  return useMutation<Session, Error, { id: number; data: { reviewEnabled?: boolean; showTeamRankings?: boolean } }>({
    mutationFn: ({ id, data }) =>
      apiFetch<Session>(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ...options?.mutation,
  });
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export const getGetLeaderboardQueryKey = (sessionId?: number) =>
  sessionId ? ["/api/leaderboard", sessionId] as const : ["/api/leaderboard"] as const;

export function useGetLeaderboard(options?: {
  query?: UseQueryOptions<LeaderboardEntry[], Error>;
  sessionId?: number;
}) {
  const { sessionId, query } = options ?? {};
  return useQuery<LeaderboardEntry[], Error>({
    queryKey: getGetLeaderboardQueryKey(sessionId),
    queryFn: ({ signal }) =>
      apiFetch<LeaderboardEntry[]>(
        sessionId ? `/api/leaderboard?sessionId=${sessionId}` : "/api/leaderboard",
        { signal },
      ),
    ...query,
  });
}

export const getGetLeaderboardStatsQueryKey = () => ["/api/leaderboard/stats"] as const;

export function useGetLeaderboardStats(options?: { query?: UseQueryOptions<LeaderboardStats, Error> }) {
  return useQuery<LeaderboardStats, Error>({
    queryKey: getGetLeaderboardStatsQueryKey(),
    queryFn: ({ signal }) => apiFetch<LeaderboardStats>("/api/leaderboard/stats", { signal }),
    ...options?.query,
  });
}

export interface SaveLeaderboardPlayer {
  playerName: string;
  teamName?: string | null;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
}

export interface SaveLeaderboardResult {
  saved: number;
}

export function useSaveLeaderboard(options?: {
  mutation?: UseMutationOptions<
    SaveLeaderboardResult,
    Error,
    { data: { sessionId: number; players: SaveLeaderboardPlayer[] } }
  >;
}) {
  return useMutation<
    SaveLeaderboardResult,
    Error,
    { data: { sessionId: number; players: SaveLeaderboardPlayer[] } }
  >({
    mutationFn: ({ data }) =>
      apiFetch<SaveLeaderboardResult>("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ...options?.mutation,
  });
}
