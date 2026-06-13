import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "wouter";
import { useGetSession, useGetQuestionSet, useSaveLeaderboard, getGetSessionQueryKey, getGetQuestionSetQueryKey } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Play, SkipForward, StopCircle, ArrowLeft, Users, Zap, CheckCircle2, Copy, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, updateDoc, collection } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function HostLiveSession() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);

  const [sessionState, setSessionState] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);

  const { data: sessionData, isLoading: isLoadingSession } = useGetSession(id, {
    query: { enabled: !!id, queryKey: getGetSessionQueryKey(id) }
  });

  const { data: setData, isLoading: isLoadingSet } = useGetQuestionSet(sessionData?.questionSetId || 0, {
    query: { enabled: !!sessionData?.questionSetId, queryKey: getGetQuestionSetQueryKey(sessionData?.questionSetId || 0) }
  });

  const activeQuestions = useMemo(() => {
    const all = setData?.questions ?? [];
    const ids: number[] | undefined = sessionState?.filteredQuestionIds;
    if (!ids || ids.length === 0) return all;
    return all.filter(q => ids.includes(q.id));
  }, [setData?.questions, sessionState?.filteredQuestionIds]);

  useEffect(() => {
    if (!sessionData?.code) return;

    const sessionRef = doc(db, `sessions/${sessionData.code}`);

    const unsubSession = onSnapshot(sessionRef, (snap) => {
      if (snap.exists()) {
        setSessionState(snap.data());
      } else {
        setDoc(sessionRef, {
          status: "lobby",
          currentQuestionIndex: 0,
          questionSetId: sessionData.questionSetId,
          hostName: sessionData.hostName,
          teamMode: sessionData.teamMode || false,
          startedAt: new Date().toISOString()
        });
      }
    });

    const unsubPlayers = onSnapshot(collection(db, `sessions/${sessionData.code}/players`), (snapshot) => {
      const p: any[] = [];
      snapshot.forEach(doc => p.push({ id: doc.id, ...doc.data() }));
      setPlayers(p.sort((a, b) => b.score - a.score));
    });

    return () => { unsubSession(); unsubPlayers(); };
  }, [sessionData?.code]);

  const handleStartGame = async () => {
    if (!sessionData?.code || activeQuestions.length === 0) return;
    // reset players' answered state so they can answer the first question
    try {
      await Promise.all(players.map((p) =>
        updateDoc(doc(db, `sessions/${sessionData.code}/players/${p.id}`), { answeredCurrentQuestion: false, lastAnswer: null }).catch(() => {}),
      ));
    } catch {
      // non-fatal
    }

    await updateDoc(doc(db, `sessions/${sessionData.code}`), {
      status: "question",
      currentQuestionIndex: 0,
      currentQuestion: activeQuestions[0],
      questionStartTime: new Date().toISOString()
    });
  };

  const handleNextQuestion = async () => {
    if (!sessionData?.code || !sessionState) return;
    const nextIndex = sessionState.currentQuestionIndex + 1;
    if (nextIndex < activeQuestions.length) {
      // reset players' answered state so they can answer the next question
      try {
        await Promise.all(players.map((p) =>
          updateDoc(doc(db, `sessions/${sessionData.code}/players/${p.id}`), { answeredCurrentQuestion: false, lastAnswer: null }).catch(() => {}),
        ));
      } catch {
        // non-fatal
      }

      await updateDoc(doc(db, `sessions/${sessionData.code}`), {
        status: "question",
        currentQuestionIndex: nextIndex,
        currentQuestion: activeQuestions[nextIndex],
        questionStartTime: new Date().toISOString()
      });
    } else {
      handleEndGame();
    }
  };

  const saveLeaderboard = useSaveLeaderboard();

  const answeredCount = useMemo(
    () => players.filter((p) => p.answeredCurrentQuestion).length,
    [players],
  );

  const handleCopyCode = () => {
    if (!sessionData?.code) return;
    navigator.clipboard.writeText(sessionData.code).then(() => {
      toast.success("Room code copied!");
    });
  };

  const handleShowResults = async () => {
    if (!sessionData?.code) return;
    await updateDoc(doc(db, `sessions/${sessionData.code}`), { status: "results" });
  };

  const handleEndGame = async () => {
    if (!sessionData?.code || !sessionData?.id) return;

    await updateDoc(doc(db, `sessions/${sessionData.code}`), { status: "ended" });

    const activePlayers = players.filter((p) => p.name);
    if (activePlayers.length > 0) {
      saveLeaderboard.mutate(
        {
          data: {
            sessionId: sessionData.id,
            players: activePlayers.map((p) => ({
              playerName: p.name as string,
              teamName: (p.teamName as string | undefined) ?? null,
              score: (p.score as number) ?? 0,
              correctAnswers: (p.correctAnswers as number) ?? 0,
              totalQuestions: activeQuestions.length,
            })),
          },
        },
        {
          onSuccess: (res) => toast.success(`Scores saved — ${res.saved} players on the leaderboard`),
          onError: () => toast.error("Failed to save scores. Scores are still visible in the live leaderboard panel."),
        },
      );
    }
  };

  if (isLoadingSession || isLoadingSet) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
        <Skeleton className="h-12 w-64 mb-4" />
        <Skeleton className="h-64 w-full max-w-4xl" />
      </div>
    );
  }

  const status = sessionState?.status || "lobby";
  const currentQ = sessionState?.currentQuestion;
  const isLastQ = sessionState?.currentQuestionIndex === activeQuestions.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-border p-4 flex items-center justify-between z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <Link href="/host">
            <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{sessionData?.questionSetName}</h1>
            <div className="text-sm text-muted-foreground font-mono">CODE: <span className="text-primary font-bold">{sessionData?.code}</span></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
            title="Copy room code"
          >
            <Copy className="w-3 h-3" />
            Copy code
          </button>
          <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full border border-border">
            <Users className="w-4 h-4 text-secondary" />
            <span className="font-bold font-mono">{players.length}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <main className="flex-1 p-6 flex flex-col items-center justify-center overflow-y-auto relative">
          <AnimatePresence mode="wait">
            {status === "lobby" && (
              <motion.div key="lobby" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="text-center w-full max-w-2xl">
                <div className="inline-block p-6 rounded-3xl bg-primary/10 border border-primary/20 mb-8 shadow-2xl">
                  <h2 className="text-2xl text-primary font-bold mb-2">Join at <span className="text-foreground">/play</span></h2>
                  <div className="text-8xl font-black tracking-widest font-mono text-foreground drop-shadow-md">{sessionData?.code}</div>
                  <button
                    onClick={handleCopyCode}
                    className="mt-4 flex items-center gap-2 mx-auto text-sm text-primary/70 hover:text-primary transition-colors"
                  >
                    <Copy className="w-4 h-4" /> Copy room code
                  </button>
                </div>
                {players.length > 0 ? (
                  <Button size="lg" className="h-20 px-12 text-2xl font-black rounded-2xl w-full max-w-md shadow-xl hover:scale-105 transition-transform" onClick={handleStartGame}>
                    <Play className="w-8 h-8 mr-3" /> START GAME
                  </Button>
                ) : (
                  <div className="text-muted-foreground text-xl flex items-center justify-center gap-3 mt-8">
                    <div className="w-6 h-6 border-4 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                    Waiting for players...
                  </div>
                )}
              </motion.div>
            )}

            {(status === "question" || status === "results") && currentQ && (
              <motion.div key="question" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-4xl flex flex-col">
                <div className="flex justify-between items-end mb-3">
                  <div className="text-sm font-bold text-muted-foreground tracking-widest uppercase">
                    Question {sessionState.currentQuestionIndex + 1} / {activeQuestions.length}
                  </div>
                  <div className="text-sm font-bold text-accent tracking-widest uppercase flex items-center gap-1">
                    <Zap className="w-4 h-4" /> {currentQ.points} PTS
                  </div>
                </div>
                {status === "question" && players.length > 0 && (
                  <div className="mb-6">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-primary" />
                        <span className="font-bold text-primary">{answeredCount}</span> / {players.length} answered
                      </span>
                      <span>{Math.round((answeredCount / players.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(answeredCount / players.length) * 100}%` }}
                        transition={{ type: "spring", stiffness: 60, damping: 15 }}
                      />
                    </div>
                  </div>
                )}
                <h2 className="text-4xl md:text-6xl font-black mb-12 leading-tight">{currentQ.text}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
                  {currentQ.options.map((opt: string, i: number) => {
                    const isCorrect = opt === currentQ.correctAnswer;
                    const showCorrect = status === "results" && isCorrect;
                    const dimOthers = status === "results" && !isCorrect;
                    return (
                      <div key={i} className={`p-6 md:p-8 rounded-2xl border-4 text-xl md:text-2xl font-bold flex items-center transition-all duration-500
                        ${showCorrect ? "bg-primary/20 border-primary text-primary shadow-[0_0_30px_rgba(var(--primary),0.3)] scale-[1.02]"
                          : dimOthers ? "bg-card border-border/30 text-muted-foreground/30 opacity-50 scale-[0.98]"
                          : "bg-card border-border text-card-foreground"}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0 text-lg ${showCorrect ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        {opt}
                        {showCorrect && <CheckCircle2 className="w-8 h-8 ml-auto text-primary" />}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {status === "ended" && (
              <motion.div key="ended" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center w-full max-w-2xl">
                <div className="text-7xl mb-4">🏆</div>
                <h2 className="text-6xl font-black mb-4 text-primary drop-shadow-lg">Game Over!</h2>
                <div className="text-xl text-muted-foreground mb-10">
                  {saveLeaderboard.isPending ? "Saving scores…" : saveLeaderboard.isError ? "Scores could not be saved." : "Final scores have been saved to the leaderboard."}
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {sessionData?.id && (
                    <Link href={`/leaderboard?session=${sessionData.id}`}>
                      <Button size="lg" className="h-16 px-8 text-xl font-bold rounded-xl shadow-xl w-full sm:w-auto">
                        <Trophy className="w-6 h-6 mr-2" /> View Results
                      </Button>
                    </Link>
                  )}
                  <Link href="/host">
                    <Button size="lg" variant="outline" className="h-16 px-8 text-xl font-bold rounded-xl border-2 w-full sm:w-auto">
                      <StopCircle className="w-6 h-6 mr-2" /> Back to Host
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <aside className="lg:w-80 bg-card border-l border-border flex flex-col">
          <div className="p-4 border-b border-border bg-muted/20">
            <h3 className="font-bold uppercase tracking-wider text-sm text-muted-foreground mb-4">Host Controls</h3>
            {status === "question" && (
              <Button size="lg" className="w-full h-16 text-xl font-bold bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleShowResults}>
                Reveal Answer
              </Button>
            )}
            {status === "results" && (
              <Button size="lg" className="w-full h-16 text-xl font-bold" onClick={handleNextQuestion}>
                {isLastQ ? <><StopCircle className="w-5 h-5 ml-2" />End Game</> : <>Next Question <SkipForward className="w-5 h-5 ml-2" /></>}
              </Button>
            )}
            {(status === "lobby" || status === "ended") && (
              <div className="h-16 flex items-center justify-center border-2 border-dashed border-border rounded-lg text-muted-foreground text-sm font-medium">
                {status === "lobby" ? "Waiting to start..." : "Session Complete"}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="font-bold uppercase tracking-wider text-sm text-muted-foreground mb-4 sticky top-0 bg-card py-1">Live Leaderboard</h3>
            <div className="space-y-2">
              {players.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-6 text-center font-bold text-muted-foreground">{i + 1}</div>
                    <div className="font-bold">{p.name}</div>
                  </div>
                  <div className="font-black text-primary font-mono">{p.score}</div>
                </div>
              ))}
              {players.length === 0 && <div className="text-center text-muted-foreground text-sm py-4">No players joined yet.</div>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
