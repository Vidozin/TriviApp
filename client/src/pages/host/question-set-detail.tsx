import { useState, useRef, useMemo } from "react";
import { Link, useParams } from "wouter";
import { useGetQuestionSet, useAddQuestionsToSet, getGetQuestionSetQueryKey } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FileUp, AlertTriangle, Plus, Filter, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { QuestionInput } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";

type QuestionType = "multiple_choice" | "true_false" | "open";
type Difficulty = "easy" | "medium" | "hard";

function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current); current = "";
    } else { current += char; }
  }
  result.push(current);
  return result.map(s => s.trim());
}

const formSchema = z.object({
  questionType: z.enum(["multiple_choice", "true_false", "open"]),
  text: z.string().min(1, "Question text is required"),
  optionA: z.string().optional(),
  optionB: z.string().optional(),
  optionC: z.string().optional(),
  optionD: z.string().optional(),
  correctAnswer: z.string().min(1, "Correct answer is required"),
  category: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  points: z.coerce.number().min(1).default(100),
  timeLimitSeconds: z.coerce.number().min(5).default(30),
});

export default function HostQuestionSetDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<QuestionInput[] | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      questionType: "multiple_choice", text: "", optionA: "", optionB: "", optionC: "", optionD: "",
      correctAnswer: "", category: "", difficulty: "medium", points: 100, timeLimitSeconds: 30,
    },
  });

  const { data: set, isLoading } = useGetQuestionSet(id, {
    query: { enabled: !!id, queryKey: getGetQuestionSetQueryKey(id) }
  });

  const allQuestions = set?.questions ?? [];

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
  const clearFilters = () => { setFilterDifficulty("all"); setFilterCategory("all"); setFilterType("all"); };

  const addQuestions = useAddQuestionsToSet({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetQuestionSetQueryKey(id) });
        setCsvPreview(null);
        setIsAddModalOpen(false);
        form.reset();
        toast.success("Questions added successfully");
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      onError: () => { toast.error("Failed to add questions"); }
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split("\n");
      const questions: QuestionInput[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = parseCSVLine(line);
        const firstCol = cols[0].toLowerCase();
        let qType: QuestionType = "multiple_choice";
        let text = "", optA = "", optB = "", optC = "", optD = "", correct = "", cat = "", diff: Difficulty = "medium", pts = "100", timeLimit = "30";
        if (["multiple_choice", "true_false", "open"].includes(firstCol)) {
          qType = firstCol as QuestionType;
          [, text, optA, optB, optC, optD, correct, cat, pts, timeLimit] = cols;
          const rawDiff = cols[8] as string;
          diff = (rawDiff === "easy" || rawDiff === "hard") ? rawDiff : "medium";
        } else {
          qType = "multiple_choice"; diff = "medium";
          [text, optA, optB, optC, optD, correct, cat, pts, timeLimit] = cols;
        }
        if (diff !== "easy" && diff !== "medium" && diff !== "hard") diff = "medium";
        if (qType === "true_false") {
          questions.push({ questionType: qType, text, options: ["True", "False"], correctAnswer: correct, category: cat || undefined, difficulty: diff, points: pts ? parseInt(pts) : 100, timeLimitSeconds: timeLimit ? parseInt(timeLimit) : 30 });
        } else if (qType === "open") {
          questions.push({ questionType: qType, text, options: [], correctAnswer: correct, category: cat || undefined, difficulty: diff, points: pts ? parseInt(pts) : 100, timeLimitSeconds: timeLimit ? parseInt(timeLimit) : 30 });
        } else if (text && optA && optB && optC && optD && correct) {
          questions.push({ questionType: "multiple_choice", text, options: [optA, optB, optC, optD], correctAnswer: correct, category: cat || undefined, difficulty: diff, points: pts ? parseInt(pts) : 100, timeLimitSeconds: timeLimit ? parseInt(timeLimit) : 30 });
        }
      }
      if (questions.length > 0) setCsvPreview(questions);
      else toast.error("No valid questions found in CSV");
    };
    reader.readAsText(file);
  };

  const handleConfirmUpload = () => {
    if (!csvPreview || csvPreview.length === 0) return;
    addQuestions.mutate({ id, data: { questions: csvPreview } });
  };

  const onManualSubmit = (values: z.infer<typeof formSchema>) => {
    const newQuestion: QuestionInput = {
      questionType: values.questionType,
      text: values.text,
      options: values.questionType === "multiple_choice"
        ? [values.optionA || "", values.optionB || "", values.optionC || "", values.optionD || ""]
        : values.questionType === "true_false" ? ["True", "False"] : [],
      correctAnswer: values.correctAnswer,
      category: values.category || undefined,
      difficulty: values.difficulty,
      points: values.points,
      timeLimitSeconds: values.timeLimitSeconds,
    };
    addQuestions.mutate({ id, data: { questions: [newQuestion] } });
  };

  const watchQuestionType = form.watch("questionType");

  const TypeBadge = ({ type }: { type?: string }) => {
    switch (type) {
      case "multiple_choice": return <Badge variant="default" className="bg-purple-500 hover:bg-purple-600">MC</Badge>;
      case "true_false": return <Badge variant="default" className="bg-cyan-500 hover:bg-cyan-600">T/F</Badge>;
      case "open": return <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">Open</Badge>;
      default: return <Badge variant="default" className="bg-purple-500 hover:bg-purple-600">MC</Badge>;
    }
  };

  const DifficultyBadge = ({ diff }: { diff?: string }) => {
    switch (diff) {
      case "easy": return <Badge variant="outline" className="text-green-500 border-green-500">Easy</Badge>;
      case "hard": return <Badge variant="outline" className="text-red-500 border-red-500">Hard</Badge>;
      default: return <Badge variant="outline" className="text-amber-500 border-amber-500">Medium</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/host/question-sets">
                <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
              </Link>
              {isLoading ? <Skeleton className="h-10 w-64" /> : <h1 className="text-4xl font-black tracking-tight">{set?.name}</h1>}
            </div>
            {!isLoading && set?.description && <p className="text-muted-foreground">{set.description}</p>}
          </div>

          <div className="flex gap-3">
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="gap-2"><Plus className="w-4 h-4" />Add Question</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add a Question</DialogTitle></DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onManualSubmit)} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="questionType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Question Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                              <SelectItem value="true_false">True/False</SelectItem>
                              <SelectItem value="open">Open Answer</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="difficulty" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select difficulty" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="text" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question Text</FormLabel>
                        <FormControl><Textarea placeholder="What is the capital of..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {watchQuestionType === "multiple_choice" && (
                      <div className="grid grid-cols-2 gap-4">
                        {(["optionA", "optionB", "optionC", "optionD"] as const).map((opt, i) => (
                          <FormField key={opt} control={form.control} name={opt} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Option {String.fromCharCode(65 + i)}</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        ))}
                      </div>
                    )}
                    {watchQuestionType === "true_false" && (
                      <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">Options are automatically True / False.</div>
                    )}
                    <FormField control={form.control} name="correctAnswer" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correct Answer</FormLabel>
                        {watchQuestionType === "true_false" ? (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select correct answer" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="True">True</SelectItem>
                              <SelectItem value="False">False</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <FormControl><Input placeholder="Exact correct answer text" {...field} /></FormControl>
                        )}
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl><Input placeholder="Optional" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="points" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Points</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="timeLimitSeconds" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time (sec)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                      <Button type="submit" className="flex-1" disabled={addQuestions.isPending}>
                        {addQuestions.isPending ? "Adding..." : "Add Question"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <label htmlFor="csv-upload">
              <Button variant="outline" className="gap-2 cursor-pointer" asChild>
                <span><FileUp className="w-4 h-4" />Upload CSV</span>
              </Button>
            </label>
            <input id="csv-upload" ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </div>
        </header>

        {csvPreview && (
          <div className="border-2 border-primary/40 bg-primary/5 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">CSV Preview — {csvPreview.length} Questions</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setCsvPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Cancel</Button>
                <Button onClick={handleConfirmUpload} disabled={addQuestions.isPending}>
                  {addQuestions.isPending ? "Importing..." : `Import ${csvPreview.length} Questions`}
                </Button>
              </div>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {csvPreview.slice(0, 5).map((q, i) => (
                <div key={i} className="bg-background p-3 rounded-lg text-sm border border-border">
                  <span className="font-bold text-muted-foreground mr-2">{i + 1}.</span> {q.text}
                </div>
              ))}
              {csvPreview.length > 5 && <div className="text-sm text-muted-foreground text-center">...and {csvPreview.length - 5} more</div>}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Questions
              {!isLoading && (
                <span className="bg-muted text-muted-foreground text-sm py-0.5 px-2 rounded-full">
                  {hasActiveFilter ? `${filteredQuestions.length} of ${allQuestions.length}` : allQuestions.length}
                </span>
              )}
            </h2>

            {!isLoading && allQuestions.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-muted-foreground text-sm flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" /> Filter:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(["all", "multiple_choice", "true_false", "open"] as const).map(t => (
                    <button key={t} onClick={() => setFilterType(t)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filterType === t
                        ? t === "all" ? "bg-foreground text-background border-foreground" : t === "multiple_choice" ? "bg-purple-500 text-white border-purple-500" : t === "true_false" ? "bg-cyan-500 text-white border-cyan-500" : "bg-amber-500 text-white border-amber-500"
                        : "border-border text-muted-foreground hover:border-foreground/40 bg-transparent"}`}>
                      {t === "all" ? "All Types" : t === "multiple_choice" ? "MC" : t === "true_false" ? "T/F" : "Open"}
                    </button>
                  ))}
                </div>
                <div className="w-px h-4 bg-border mx-1" />
                <div className="flex flex-wrap gap-1.5">
                  {(["all", "easy", "medium", "hard"] as const).map(d => (
                    <button key={d} onClick={() => setFilterDifficulty(d)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filterDifficulty === d
                        ? d === "all" ? "bg-foreground text-background border-foreground" : d === "easy" ? "bg-green-500 text-white border-green-500" : d === "medium" ? "bg-amber-500 text-white border-amber-500" : "bg-red-500 text-white border-red-500"
                        : "border-border text-muted-foreground hover:border-foreground/40 bg-transparent"}`}>
                      {d === "all" ? "All Levels" : d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
                {categories.length > 0 && (
                  <>
                    <div className="w-px h-4 bg-border mx-1" />
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => setFilterCategory("all")} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filterCategory === "all" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground/40 bg-transparent"}`}>All Categories</button>
                      {categories.map(cat => (
                        <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filterCategory === cat ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground/40 bg-transparent"}`}>{cat}</button>
                      ))}
                    </div>
                  </>
                )}
                {hasActiveFilter && (
                  <button onClick={clearFilters} className="ml-1 flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
          ) : allQuestions.length > 0 ? (
            filteredQuestions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                <Filter className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <h3 className="text-lg font-bold mb-1">No questions match your filters</h3>
                <p className="text-sm mb-4">Try adjusting your filters or <button onClick={clearFilters} className="underline hover:text-foreground">clear them all</button>.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredQuestions.map((q, i) => (
                  <Card key={q.id} className="border-card-border bg-card/50 overflow-hidden">
                    <div className="h-1 w-full bg-gradient-to-r from-primary/20 to-transparent" />
                    <CardContent className="p-4 flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <TypeBadge type={q.questionType} />
                          <DifficultyBadge diff={q.difficulty} />
                          {q.category && <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground">{q.category}</Badge>}
                          <span className="ml-auto text-muted-foreground font-mono text-sm">Q{i + 1}</span>
                        </div>
                        <h3 className="font-bold text-lg mb-4">{q.text}</h3>
                        {q.questionType === "multiple_choice" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                            {q.options?.map((opt, j) => (
                              <div key={j} className={`p-3 rounded-lg border text-sm flex items-center gap-3 ${opt === q.correctAnswer ? "bg-primary/10 border-primary text-primary font-bold" : "border-border/50 bg-background/50 text-muted-foreground"}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${opt === q.correctAnswer ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{["A", "B", "C", "D"][j]}</div>
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}
                        {q.questionType === "true_false" && (
                          <div className="flex gap-4 mt-4">
                            {["True", "False"].map(opt => (
                              <div key={opt} className={`px-6 py-3 rounded-full border text-sm font-bold ${opt === q.correctAnswer ? "bg-primary text-primary-foreground border-primary" : "border-border/50 bg-background/50 text-muted-foreground"}`}>{opt}</div>
                            ))}
                          </div>
                        )}
                        {q.questionType === "open" && (
                          <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-dashed border-border/50">
                            <span className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Expected Answer (Host Marking)</span>
                            <span className="font-bold text-foreground">{q.correctAnswer}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-row md:flex-col gap-4 md:min-w-32 md:border-l md:border-border/50 md:pl-6 justify-center">
                        <div className="text-sm bg-muted/30 p-3 rounded-lg">
                          <span className="text-muted-foreground block text-xs uppercase mb-1">Time Limit</span>
                          <span className="font-mono font-bold text-lg">{q.timeLimitSeconds}s</span>
                        </div>
                        <div className="text-sm bg-muted/30 p-3 rounded-lg">
                          <span className="text-muted-foreground block text-xs uppercase mb-1">Points</span>
                          <span className="font-bold text-lg text-accent">{q.points}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <h3 className="text-xl font-bold mb-2">No questions yet</h3>
              <p className="mb-4">Upload a CSV or add questions manually to populate this set.</p>
              <div className="bg-muted p-4 rounded-lg inline-block text-left max-w-2xl overflow-x-auto mx-auto mt-2">
                <p className="text-xs text-foreground font-bold mb-2">CSV Format:</p>
                <p className="text-xs font-mono whitespace-nowrap text-muted-foreground">question_type,question,opt_a,opt_b,opt_c,opt_d,correct_answer,category,difficulty,points,time_limit</p>
                <p className="text-xs mt-2 text-foreground font-bold mb-1">Examples:</p>
                <ul className="text-xs font-mono text-muted-foreground space-y-1">
                  <li>multiple_choice,"What is 2+2?","3","4","5","6","4",Math,easy,100,30</li>
                  <li>true_false,"The sky is blue",,,,,True,Science,easy,100,20</li>
                  <li>open,"Who wrote Hamlet?",,,,,"William Shakespeare",Literature,hard,200,45</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
