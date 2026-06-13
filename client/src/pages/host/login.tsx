import { useState } from "react";
import { useLocation } from "wouter";
import { Mic, Loader2 } from "lucide-react";
import { useHostLogin, getGetAuthStatusQueryKey } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function HostLogin() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useHostLogin({
    mutation: {
      onSuccess: () => {
        // optimistically mark as authenticated so HostGuard won't redirect
        queryClient.setQueryData(getGetAuthStatusQueryKey(), { authenticated: true });
        queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() });
        setLocation("/host");
      },
      onError: () => {
        setError("Incorrect password");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password) return;
    loginMutation.mutate({ data: { password } });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 w-full max-w-md"
      >
        <Card className="border-card-border bg-card/50 shadow-2xl backdrop-blur-xl">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto mb-6 inline-flex items-center justify-center p-4 bg-primary/10 border border-primary/20 rounded-2xl shadow-inner">
              <Mic className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tight">Host Login</CardTitle>
            <CardDescription className="text-lg mt-2">Enter the control room.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Enter password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 text-center text-lg bg-background/50 border-2"
                  autoFocus
                />
                {error && (
                  <p className="text-destructive text-sm text-center font-medium animate-in slide-in-from-top-1">
                    {error}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full h-14 text-lg font-bold"
                disabled={loginMutation.isPending || !password}
              >
                {loginMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Log In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
