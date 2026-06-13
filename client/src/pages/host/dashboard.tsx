import { Link, useLocation } from "wouter";
import { useListSessions, useListQuestionSets, useGetQuestionSet, getListSessionsQueryKey, getListQuestionSetsQueryKey, getGetQuestionSetQueryKey, useCreateSession } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Plus, Settings, Play, Server, Clock, Users, ArrowLeft, LogOut, Filter, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export default function HostDashboard() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [hostName, setHostName] = useState("Host");
  const [selectedSet, setSelectedSet] = useState("");
  const [teamMode, setTeamMode] = useState(false);

  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const { data: sessions, isLoading: isLoadingSessions } = useListSessions({
    query: { queryKey: getListSessionsQueryKey() }
  });

  const { data: sets, isLoading: isLoadingSets } = useListQuestionSets({
    query: { queryKey: getListQuestionSetsQueryKey() }
  });

  const selectedSetId = selectedSet ? parseInt(selectedSet) : 0;
  const { data: selectedSetData, isLoading: isLoadingSetQuestions } = useGetQuestionSet(selectedSetId, {
    query: { enabled: !!selectedSetId, queryKey: getGetQuestionSetQueryKey(selectedSetId) }
  });

  const allQuestions = selectedSetData?.questions ?? [];

  const categories = useMemo(() => {
    const cats = new Set<string>();
    allQuestions.forEach(q => { if (q.category) cats.add(q.category); });
    return Array.from(cats).sort();
  }, [allQuestions]);

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) return false;
      if (filterCategory !== "all" && q.category !== filterCategory) return false;
      if (filterType !== "all" && q.questionType !== filterType) return false;
      return true;
    });
  }, [allQuestions, filterDifficulty, filterCategory, filterType]);

  const hasActiveFilter = filterDifficulty !== "all" || filterCategory !== "all" || filterType !== "all";

  const clearFilters = () => {
    setFilterDifficulty("all");
    setFilterCategory("all");
    setFilterType("all");
  };

  const handleSetChange = (val: string) => {
    setSelectedSet(val);
    clearFilters();
  };

  const createSession = useCreateSession();

  const handleCreateSession = async () => {
    if (!selectedSet || !hostName) return;

    createSession.mutate(
      { data: { questionSetId: parseInt(selectedSet), hostName, teamMode } },
      {
        onSuccess: async (session) => {
          if (hasActiveFilter && filteredQuestions.length > 0) {
            try {
              await setDoc(doc(db, `sessions/${session.code}`), {
                status: "lobby",
                currentQuestionIndex: 0,
                questionSetId: session.questionSetId,
                hostName: session.hostName,
                teamMode: session.teamMode ?? false,
                startedAt: new Date().toISOString(),
                filteredQuestionIds: filteredQuestions.map(q => q.id),
              });
            } catch {
              // Non-fatal
            }
          }
          setIsCreating(false);
          setLocation(`/host/session/${session.id}`);
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-4xl font-black tracking-tight">Host Dashboard</h1>
            </div>
            <p className="text-muted-foreground">Manage your games and start live sessions.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/host/question-sets">
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                Manage Questions
              </Button>
            </Link>
            <Button variant="outline" className="gap-2" onClick={logout}>
              <LogOut className="w-4 h-4" />
              Log Out
            </Button>
            <Dialog open={isCreating} onOpenChange={(open) => {
              setIsCreating(open);
              if (!open) { setSelectedSet(""); clearFilters(); }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2 font-bold">
                  <Plus className="w-4 h-4" />
                  New Session
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Start a New Game</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 py-4">
                  <div className="space-y-2">
                    <Label>Question Set</Label>
                    <Select value={selectedSet} onValueChange={handleSetChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a question set" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingSets ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : sets?.map(s => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.name} ({s.questionCount} Qs)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedSetId > 0 && (
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold flex items-center gap-1.5">
                          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                          Question Subset
                        </span>
                        <span className={`text-sm font-mono font-bold ${hasActiveFilter ? "text-primary" : "text-muted-foreground"}`}>
                          {isLoadingSetQuestions ? "…" : hasActiveFilter ? `${filteredQuestions.length} of ${allQuestions.length}` : `${allQuestions.length} questions`}
                        </span>
                      </div>
                      {isLoadingSetQuestions ? (
                        <div className="text-xs text-muted-foreground">Loading questions…</div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {(["all", "multiple_choice", "true_false", "open"] as const).map(t => (
                              <FilterPill key={t} active={filterType === t} onClick={() => setFilterType(t)}
                                color={t === "all" ? "default" : t === "multiple_choice" ? "purple" : t === "true_false" ? "cyan" : "amber"}
                                label={t === "all" ? "All Types" : t === "multiple_choice" ? "MC" : t === "true_false" ? "T/F" : "Open"} />
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(["all", "easy", "medium", "hard"] as const).map(d => (
                              <FilterPill key={d} active={filterDifficulty === d} onClick={() => setFilterDifficulty(d)}
                                color={d === "all" ? "default" : d === "easy" ? "green" : d === "medium" ? "amber" : "red"}
                                label={d === "all" ? "All Levels" : d.charAt(0).toUpperCase() + d.slice(1)} />
                            ))}
                          </div>
                          {categories.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              <FilterPill active={filterCategory === "all"} onClick={() => setFilterCategory("all")} color="default" label="All Categories" />
                              {categories.map(cat => (
                                <FilterPill key={cat} active={filterCategory === cat} onClick={() => setFilterCategory(cat)} color="primary" label={cat} />
                              ))}
                            </div>
                          )}
                          {hasActiveFilter && (
                            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                              <X className="w-3 h-3" /> Clear filters — use all {allQuestions.length} questions
                            </button>
                          )}
                          {hasActiveFilter && filteredQuestions.length === 0 && (
                            <p className="text-xs text-destructive font-medium">No questions match these filters — adjust before continuing.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Host Name</Label>
                    <Input value={hostName} onChange={e => setHostName(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <Label className="text-base">Team Mode</Label>
                      <p className="text-xs text-muted-foreground">Ask players for team names</p>
                    </div>
                    <Switch checked={teamMode} onCheckedChange={setTeamMode} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                  <Button
                    onClick={handleCreateSession}
                    disabled={!selectedSet || !hostName || createSession.isPending || (hasActiveFilter && filteredQuestions.length === 0)}
                  >
                    {createSession.isPending ? "Creating..." : (hasActiveFilter ? `Start with ${filteredQuestions.length} Questions` : "Create Session")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-card-border bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                Active & Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSessions ? (
                <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
              ) : sessions && sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.slice(0, 5).map(session => (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                      <div>
                        <div className="font-bold">{session.questionSetName}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1 font-mono uppercase bg-muted px-2 py-0.5 rounded">{session.code}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(session.createdAt).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{session.playerCount}</span>
                        </div>
                      </div>
                      <Link href={`/host/session/${session.id}`}>
                        <Button size="sm" variant={session.status === 'ended' ? "secondary" : "default"} className="gap-2">
                          {session.status === 'ended' ? "View" : <><Play className="w-3 h-3" /> Resume</>}
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                  <Server className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p>No sessions yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-card-border bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-secondary" />
                Your Question Sets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSets ? (
                <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : sets && sets.length > 0 ? (
                <div className="space-y-3">
                  {sets.slice(0, 5).map(set => (
                    <div key={set.id} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                      <div className="font-medium">{set.name}</div>
                      <div className="text-sm text-muted-foreground">{set.questionCount} Qs</div>
                    </div>
                  ))}
                  {sets.length > 5 && (
                    <Link href="/host/question-sets">
                      <Button variant="link" className="w-full text-muted-foreground">View all sets...</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                  <Settings className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p>No question sets yet.</p>
                  <Link href="/host/question-sets">
                    <Button variant="link" className="mt-2">Create one</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

type PillColor = "default" | "purple" | "cyan" | "amber" | "green" | "red" | "primary";

function FilterPill({ active, onClick, color, label }: { active: boolean; onClick: () => void; color: PillColor; label: string; }) {
  const activeClasses: Record<PillColor, string> = {
    default: "bg-foreground text-background border-foreground",
    purple: "bg-purple-500 text-white border-purple-500",
    cyan: "bg-cyan-500 text-white border-cyan-500",
    amber: "bg-amber-500 text-white border-amber-500",
    green: "bg-green-500 text-white border-green-500",
    red: "bg-red-500 text-white border-red-500",
    primary: "bg-primary text-primary-foreground border-primary",
  };
  return (
    <button onClick={onClick} className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${active ? activeClasses[color] : "border-border text-muted-foreground hover:border-foreground/40 bg-transparent"}`}>
      {label}
    </button>
  );
}
