import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PlayCircle, Mic, Trophy } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 flex flex-col items-center max-w-2xl text-center"
      >
        <div className="mb-8 inline-flex items-center justify-center p-4 bg-card border border-card-border rounded-2xl shadow-xl">
          <Mic className="w-12 h-12 text-primary" />
        </div>

        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-white/60">
          TriviaHost
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground mb-12 font-medium max-w-lg">
          The ultimate platform for live, electric trivia nights. Host like a pro, play like a champion.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/play" className="w-full sm:w-auto">
            <Button size="lg" className="w-full text-lg h-16 px-8 rounded-xl font-bold gap-2">
              <PlayCircle className="w-6 h-6" />
              Join a Game
            </Button>
          </Link>

          <Link href="/host/login" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full text-lg h-16 px-8 rounded-xl font-bold gap-2 border-2">
              <Mic className="w-6 h-6" />
              Host a Game
            </Button>
          </Link>
        </div>

        <div className="mt-12">
          <Link href="/leaderboard">
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              <Trophy className="w-5 h-5" />
              View Leaderboard
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
