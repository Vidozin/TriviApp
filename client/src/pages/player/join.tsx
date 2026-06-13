import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlayCircle } from "lucide-react";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export default function PlayerJoin() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) return;

    setLoading(true);
    try {
      const formattedCode = code.toUpperCase().trim();
      const playerId = generateId();

      await setDoc(doc(db, `sessions/${formattedCode}/players`, playerId), {
        name,
        teamName: teamName || null,
        score: 0,
        answeredCurrentQuestion: false,
        lastAnswer: null,
        joinedAt: new Date().toISOString(),
      });

      localStorage.setItem(`trivia_player_${formattedCode}`, playerId);
      localStorage.setItem(`trivia_name_${formattedCode}`, name);

      setLocation(`/play/${formattedCode}`);
    } catch (err) {
      console.error("Failed to join:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md"
      >
        <Card className="border-2 border-primary/20 shadow-2xl bg-card/50 backdrop-blur-xl">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <PlayCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-black">Join Game</CardTitle>
            <CardDescription className="text-lg">Enter the room code to start playing</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-lg">Room Code</Label>
                <Input
                  id="code"
                  placeholder="e.g. ABCD"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="text-2xl text-center uppercase tracking-widest h-14 font-mono"
                  maxLength={6}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-lg">Your Name</Label>
                <Input
                  id="name"
                  placeholder="What should we call you?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-lg h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team" className="text-lg">
                  Team Name <span className="text-muted-foreground text-sm font-normal">(Optional)</span>
                </Label>
                <Input
                  id="team"
                  placeholder="Got a clever team name?"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="text-lg h-12"
                />
              </div>

              <Button type="submit" size="lg" className="w-full h-16 text-xl font-bold mt-4" disabled={!code || !name || loading}>
                {loading ? "Joining..." : "Enter Room"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t border-border/50 pt-6">
            <Link href="/">
              <Button variant="ghost" className="text-muted-foreground">
                Back to Home
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
