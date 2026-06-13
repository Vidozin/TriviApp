import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Clock, AlertCircle } from "lucide-react";

export default function PlayerGame() {
  const params = useParams();
  const code = params.code?.toUpperCase();
  const [, setLocation] = useLocation();

  const [sessionState, setSessionState] = useState<any>(null);
  const [playerState, setPlayerState] = useState<any>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!code) return;
    const pId = localStorage.getItem(`trivia_player_${code}`);
    if (!pId) { setLocation('/play'); return; }
    setPlayerId(pId);

    const unsubSession = onSnapshot(doc(db, `sessions/${code}`), (snap) => {
      if (snap.exists()) {
        setSessionState(snap.data());
      } else {
        setLocation('/play');
      }
    });

    const unsubPlayer = onSnapshot(doc(db, `sessions/${code}/players/${pId}`), (snap) => {
      if (snap.exists()) setPlayerState(snap.data());
    });

    return () => { unsubSession(); unsubPlayer(); };
  }, [code, setLocation]);

  useEffect(() => {
    if (sessionState?.status !== "question" || !sessionState?.currentQuestion?.timeLimitSeconds) {
      setTimeLeft(null);
      return;
    }
    const startTimeStr = sessionState.questionStartTime;
    if (!startTimeStr) return;
    const startTime = new Date(startTimeStr).getTime();
    const limitMs = sessionState.currentQuestion.timeLimitSeconds * 1000;
    const interval = setInterval(() => {
      const remaining = Math.max(0, limitMs - (Date.now() - startTime));
      setTimeLeft(Math.ceil(remaining / 1000));
      if (remaining === 0) clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
  }, [sessionState?.status, sessionState?.currentQuestion, sessionState?.questionStartTime]);

  // Clear selected answer only when a new question starts
  useEffect(() => {
    if (sessionState?.status === "question") {
      setSelectedAnswer(null);
    }
  }, [sessionState?.currentQuestionIndex, sessionState?.questionStartTime]);

  const handleAnswer = async (answer: string) => {
    if (!code || !playerId || !sessionState?.currentQuestion || sessionState.status !== "question") return;
    if (timeLeft === 0) return;
    if (selectedAnswer !== null) return; // prevent double answering
    const qIndex = sessionState.currentQuestionIndex;
    const isCorrect = answer === sessionState.currentQuestion.correctAnswer;
    const points = isCorrect ? sessionState.currentQuestion.points : 0;
    setSelectedAnswer(answer);
    await setDoc(doc(db, `sessions/${code}/answers/${qIndex}_${playerId}`), {
      playerId, questionIndex: qIndex, answer, isCorrect, pointsEarned: points, answeredAt: new Date().toISOString()
    });
    const playerRef = doc(db, `sessions/${code}/players/${playerId}`);
    const snap = await getDoc(playerRef);
    if (snap.exists()) {
      await setDoc(playerRef, { ...snap.data(), score: (snap.data().score || 0) + points, answeredCurrentQuestion: true, lastAnswer: answer });
    }
  };

  if (!sessionState || !playerState) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const status = sessionState.status;
  const currentQ = sessionState.currentQuestion;

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground font-sans">
      <header className="p-4 flex items-center justify-between border-b border-border bg-card">
        <div className="font-bold truncate max-w-[50%]">{playerState.name}</div>
        <div className="flex items-center gap-2 bg-primary/20 text-primary px-3 py-1 rounded-full font-bold">
          <Trophy className="w-4 h-4" />
          {playerState.score} PTS
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {status === "lobby" && (
            <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                <Clock className="w-10 h-10 text-muted-foreground animate-pulse" />
              </div>
              <h2 className="text-3xl font-black mb-2">You're In!</h2>
              <p className="text-muted-foreground text-xl">Look at the big screen. The host will start the game soon.</p>
            </motion.div>
          )}

          {status === "question" && currentQ && (
            <motion.div key={`question-${sessionState.currentQuestionIndex}`}
              initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }}
              className="absolute inset-0 flex flex-col p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-bold text-muted-foreground tracking-widest uppercase">Q {sessionState.currentQuestionIndex + 1}</div>
                {timeLeft !== null && (
                  <div className={`text-xl font-bold font-mono ${timeLeft <= 5 ? 'text-destructive animate-pulse' : ''}`}>{timeLeft}s</div>
                )}
              </div>
              <h2 className="text-2xl md:text-4xl font-bold mb-8 leading-snug">{currentQ.text}</h2>
              <div className="flex-1 flex flex-col gap-3">
                {currentQ.options.map((opt: string, i: number) => {
                  const isSelected = selectedAnswer === opt;
                  const hasAnswered = selectedAnswer !== null;
                  return (
                    <Button key={i} variant="outline"
                      className={`h-auto min-h-[4rem] text-left justify-start p-4 text-lg md:text-xl font-medium border-2 rounded-xl transition-all whitespace-normal
                        ${isSelected ? 'bg-primary border-primary text-primary-foreground scale-[1.02]' : ''}
                        ${hasAnswered && !isSelected ? 'opacity-50 grayscale' : ''}`}
                      onClick={() => handleAnswer(opt)} disabled={hasAnswered || timeLeft === 0}>
                      <div className="w-8 h-8 rounded-full bg-background/20 flex items-center justify-center mr-4 shrink-0 text-sm font-bold">
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="flex-1">{opt}</span>
                    </Button>
                  );
                })}
              </div>
              {selectedAnswer && (
                <div className="text-center p-4 mt-auto font-bold text-muted-foreground animate-pulse">
                  Answer locked in. Waiting for others...
                </div>
              )}
            </motion.div>
          )}

          {status === "results" && currentQ && (
            <motion.div key={`results-${sessionState.currentQuestionIndex}`}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              {selectedAnswer === currentQ.correctAnswer ? (
                <div className="bg-primary/20 border-2 border-primary text-primary p-8 rounded-3xl w-full max-w-sm">
                  <h2 className="text-4xl font-black mb-2">+ {currentQ.points}</h2>
                  <p className="text-xl font-bold">Correct!</p>
                </div>
              ) : selectedAnswer ? (
                <div className="bg-destructive/20 border-2 border-destructive text-destructive p-8 rounded-3xl w-full max-w-sm">
                  <h2 className="text-4xl font-black mb-2">0</h2>
                  <p className="text-xl font-bold">Incorrect!</p>
                  <p className="text-sm mt-4 opacity-80 font-medium">Correct answer was: {currentQ.correctAnswer}</p>
                </div>
              ) : (
                <div className="bg-muted border-2 border-border text-muted-foreground p-8 rounded-3xl w-full max-w-sm">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                  <h2 className="text-2xl font-black mb-2">Time's Up</h2>
                  <p className="text-sm mt-4 opacity-80 font-medium">Correct answer was: {currentQ.correctAnswer}</p>
                </div>
              )}
            </motion.div>
          )}

          {status === "ended" && (
            <motion.div key="ended" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-card">
              <Trophy className="w-24 h-24 text-primary mb-6" />
              <h2 className="text-4xl font-black mb-2 text-foreground">Game Over</h2>
              <div className="text-xl text-muted-foreground mb-8">Final Score</div>
              <div className="text-7xl font-black text-primary font-mono">{playerState.score}</div>
              <Button className="mt-12 w-full max-w-xs h-14 text-lg font-bold" onClick={() => setLocation('/')}>
                Return Home
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
