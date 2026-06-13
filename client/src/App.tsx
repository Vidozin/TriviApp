import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth";
import { HostGuard } from "@/components/HostGuard";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import HostLogin from "@/pages/host/login";
import HostDashboard from "@/pages/host/dashboard";
import HostQuestionSets from "@/pages/host/question-sets";
import HostQuestionSetDetail from "@/pages/host/question-set-detail";
import HostLiveSession from "@/pages/host/live-session";
import PlayerJoin from "@/pages/player/join";
import PlayerGame from "@/pages/player/game";
import Leaderboard from "@/pages/leaderboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/host/login" component={HostLogin} />
      <Route path="/host">
        {() => <HostGuard><HostDashboard /></HostGuard>}
      </Route>
      <Route path="/host/question-sets">
        {() => <HostGuard><HostQuestionSets /></HostGuard>}
      </Route>
      <Route path="/host/question-sets/:id">
        {() => <HostGuard><HostQuestionSetDetail /></HostGuard>}
      </Route>
      <Route path="/host/session/:id">
        {() => <HostGuard><HostLiveSession /></HostGuard>}
      </Route>
      <Route path="/play" component={PlayerJoin} />
      <Route path="/play/:code" component={PlayerGame} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base="">
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
          <SonnerToaster richColors position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
