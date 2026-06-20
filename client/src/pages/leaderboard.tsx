import { useGetLeaderboard, useGetLeaderboardStats, useGetSession, getGetLeaderboardQueryKey, getGetLeaderboardStatsQueryKey, getGetSessionQueryKey } from "@/lib/api";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, ArrowLeft, Users, Gamepad2, Medal, X, UsersRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

export default function Leaderboard() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const rawSession = params.get("session");
  const sessionId = rawSession ? parseInt(rawSession, 10) : undefined;
  const isFiltered = !!sessionId && !Number.isNaN(sessionId);

  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useGetLeaderboard({
    sessionId: isFiltered ? sessionId : undefined,
    query: { queryKey: getGetLeaderboardQueryKey(isFiltered ? sessionId : undefined) },
  });

  const { data: sessionData } = useGetSession(sessionId ?? 0, {
    query: { enabled: isFiltered, queryKey: getGetSessionQueryKey(sessionId ?? 0) },
  });

  const showTeamRankings = isFiltered && !!sessionData?.showTeamRankings;

  const teamRankings = useMemo(() => {
    if (!showTeamRankings || !leaderboard) return null;
    const teams: Record<string, { teamName: string; totalScore: number; correctAnswers: number; totalQuestions: number; playerCount: number }> = {};
    leaderboard.forEach(entry => {
      const key = entry.teamName || entry.playerName;
      if (!teams[key]) teams[key] = { teamName: key, totalScore: 0, correctAnswers: 0, totalQuestions: entry.totalQuestions, playerCount: 0 };
      teams[key].totalScore += entry.score;
      teams[key].correctAnswers += entry.correctAnswers;
      teams[key].playerCount++;
    });
    return Object.values(teams).sort((a, b) => b.totalScore - a.totalScore);
  }, [showTeamRankings, leaderboard]);

  const { data: stats, isLoading: isLoadingStats } = useGetLeaderboardStats({
    query: { queryKey: getGetLeaderboardStatsQueryKey() },
  });

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href={isFiltered ? `/host/session/${sessionId}` : "/"}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-4xl font-black flex items-center gap-3">
              <Trophy className="w-10 h-10 text-primary" />
              {isFiltered ? "Session Results" : "Hall of Fame"}
            </h1>
            {isFiltered && (
              <p className="text-muted-foreground mt-1">
                Showing final scores for session #{sessionId}
              </p>
            )}
          </div>
          {isFiltered && (
            <Link href="/leaderboard">
              <Button variant="outline" size="sm" className="gap-2 rounded-full">
                <X className="w-3 h-3" /> View All Time
              </Button>
            </Link>
          )}
        </div>

        {!isFiltered && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card border-card-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
                <Gamepad2 className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-bold">{stats?.totalSessions || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-card-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Players</CardTitle>
                <Users className="w-4 h-4 text-secondary" />
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-bold">{stats?.totalPlayers || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-card-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Most Played</CardTitle>
                <Medal className="w-4 h-4 text-accent" />
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <div className="text-xl font-bold truncate">{stats?.mostPlayedSet || "N/A"}</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-card-border bg-card/50">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              {showTeamRankings ? <><UsersRound className="w-6 h-6" /> Team Rankings</> : (isFiltered ? "Final Rankings" : "Top Players")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingLeaderboard ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : showTeamRankings && teamRankings ? (
              teamRankings.length > 0 ? (
                <div className="space-y-4">
                  {teamRankings.map((team, index) => (
                    <div key={team.teamName} className="flex items-center justify-between p-4 rounded-xl bg-background border border-border">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                          ${index === 0 ? "bg-yellow-500/20 text-yellow-500" : index === 1 ? "bg-gray-400/20 text-gray-400" : index === 2 ? "bg-amber-700/20 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                        </div>
                        <div>
                          <div className="font-bold text-lg">{team.teamName}</div>
                          <div className="text-xs text-muted-foreground">{team.playerCount} player{team.playerCount !== 1 ? "s" : ""} · {team.correctAnswers}/{team.totalQuestions * team.playerCount} correct</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-primary">{team.totalScore} pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No scores saved for this session.</p>
                </div>
              )
            ) : leaderboard && leaderboard.length > 0 ? (
              <div className="space-y-4">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-background border border-border"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                        ${index === 0 ? "bg-yellow-500/20 text-yellow-500" : index === 1 ? "bg-gray-400/20 text-gray-400" : index === 2 ? "bg-amber-700/20 text-amber-700" : "bg-muted text-muted-foreground"}`}
                      >
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                      </div>
                      <div>
                        <div className="font-bold text-lg">{entry.playerName}</div>
                        {entry.teamName && <div className="text-sm text-muted-foreground">{entry.teamName}</div>}
                        {!isFiltered && entry.questionSetName && (
                          <div className="text-xs text-muted-foreground/60">{entry.questionSetName}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-primary">{entry.score} pts</div>
                      <div className="text-xs text-muted-foreground">
                        {entry.correctAnswers}/{entry.totalQuestions} correct
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>{isFiltered ? "No scores saved for this session." : "No records yet. Be the first!"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
