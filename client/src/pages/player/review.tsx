import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetQuestionSet, getGetQuestionSetQueryKey } from "@/lib/api";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle, ListChecks } from "lucide-react";

interface AnswerRecord {
  answer: string | null;
  isCorrect: boolean;
  pointsEarned: number;
}

export default function PlayerReview() {
  const params = useParams();
  const code = params.code?.toUpperCase();
  const [, setLocation] = useLocation();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sessionState, setSessionState] = useState<any>(null);
  const [playerState, setPlayerState] = useState<any>(null);
  const [answersByIndex, setAnswersByIndex] = useState<Record<number, AnswerRecord>>({});

  useEffect(() => {
    if (!code) return;
    const playerId = localStorage.getItem(`trivia_player_${code}`);
    if (!playerId) { setLocation("/play"); return; }

    (async () => {
      const sessionSnap = await getDoc(doc(db, `sessions/${code}`));
      if (!sessionSnap.exists()) { setNotFound(true); setLoading(false); return; }
      setSessionState(sessionSnap.data());

      const playerSnap = await getDoc(doc(db, `sessions/${code}/players/${playerId}`));
      if (playerSnap.exists()) setPlayerState(playerSnap.data());

      const answersQuery = query(collection(db, `sessions/${code}/answers`), where("playerId", "==", playerId));
      const answersSnap = await getDocs(answersQuery);
      const map: Record<number, AnswerRecord> = {};
      answersSnap.forEach((d) => {
        const data = d.data();
        map[data.questionIndex] = { answer: data.answer ?? null, isCorrect: !!data.isCorrect, pointsEarned: data.pointsEarned ?? 0 };
      });
      setAnswersByIndex(map);
      setLoading(false);
    })();
  }, [code, setLocation]);

  const { data: setData, isLoading: isLoadingSet } = useGetQuestionSet(sessionState?.questionSetId || 0, {
    query: { enabled: !!sessionState?.questionSetId, queryKey: getGetQuestionSetQueryKey(sessionState?.questionSetId || 0) },
  });

  const activeQuestions = useMemo(() => {
    const all = setData?.questions ?? [];
    const ids: number[] | undefined = sessionState?.filteredQuestionIds;
    if (!ids || ids.length === 0) return all;
    return all.filter((q) => ids.includes(q.id));
  }, [setData?.questions, sessionState?.filteredQuestionIds]);

  if (loading || (sessionState?.questionSetId && isLoadingSet)) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center">
        <div className="w-full max-w-2xl space-y-3 pt-10">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Session not found</h2>
        <p className="text-muted-foreground mb-6">This game session no longer exists.</p>
        <Button onClick={() => setLocation("/")}>Return Home</Button>
      </div>
    );
  }

  if (!sessionState?.reviewEnabled) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <ListChecks className="w-12 h-12 text-muted-foreground mb-4 opacity-40" />
        <h2 className="text-2xl font-bold mb-2">Review not available</h2>
        <p className="text-muted-foreground mb-6">The host hasn't turned on question review for this game.</p>
        <Button onClick={() => setLocation("/")}>Return Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4 sticky top-0 bg-background py-2 z-10">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black">Question Review</h1>
            {playerState?.name && (
              <p className="text-sm text-muted-foreground">{playerState.name} · {playerState.score ?? 0} pts</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {activeQuestions.map((q, i) => {
            const record = answersByIndex[i];
            const answered = !!record?.answer;
            const isCorrect = answered && record.isCorrect;

            return (
              <div key={q.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Question {i + 1}</div>
                  {isCorrect ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                    </span>
                  ) : answered ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-full shrink-0">
                      <XCircle className="w-3.5 h-3.5" /> Incorrect
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">
                      <MinusCircle className="w-3.5 h-3.5" /> No Answer
                    </span>
                  )}
                </div>
                <p className="font-bold text-lg mb-4">{q.text}</p>
                <div className="space-y-1.5 text-sm">
                  <div className={`flex gap-2 ${isCorrect ? "text-primary" : "text-destructive"}`}>
                    <span className="font-semibold shrink-0">Your answer:</span>
                    <span className="font-medium">{answered ? record.answer : "—"}</span>
                  </div>
                  {!isCorrect && (
                    <div className="flex gap-2 text-primary">
                      <span className="font-semibold shrink-0">Correct answer:</span>
                      <span className="font-medium">{q.correctAnswer}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {activeQuestions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No questions found for this session.</div>
          )}
        </div>
      </div>
    </div>
  );
}
