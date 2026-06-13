import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListQuestionSets, useCreateQuestionSet, useDeleteQuestionSet, getListQuestionSetsQueryKey } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Settings, Trash2, Library } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function HostQuestionSets() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const { data: sets, isLoading } = useListQuestionSets({
    query: { queryKey: getListQuestionSetsQueryKey() }
  });

  const createSet = useCreateQuestionSet({
    mutation: {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getListQuestionSetsQueryKey() });
        setIsCreating(false);
        setName("");
        setDescription("");
        setCategory("");
        setLocation(`/host/question-sets/${result.id}`);
      },
      onError: () => {
        toast.error("Failed to create question set. Check your connection and try again.");
      },
    }
  });

  const deleteSet = useDeleteQuestionSet({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListQuestionSetsQueryKey() });
      },
      onError: () => {
        toast.error("Failed to delete question set.");
      },
    }
  });

  const handleCreate = () => {
    if (!name.trim()) return;
    createSet.mutate({
      data: {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/host">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-4xl font-black tracking-tight">Question Sets</h1>
            </div>
            <p className="text-muted-foreground">Manage your trivia questions across different categories.</p>
          </div>

          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-bold">
                <Plus className="w-4 h-4" />
                Create Set
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Question Set</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 90s Pop Culture" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!name || createSet.isPending}>
                  {createSet.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)
          ) : sets && sets.length > 0 ? (
            sets.map(set => (
              <Card key={set.id} className="border-card-border bg-card/50 flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl line-clamp-2">{set.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/20 -mr-2 -mt-2"
                      onClick={(e) => {
                        e.preventDefault();
                        if (confirm(`Delete question set "${set.name}"?`)) {
                          deleteSet.mutate({ id: set.id });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {set.description && <CardDescription className="line-clamp-2">{set.description}</CardDescription>}
                </CardHeader>
                <CardContent className="mt-auto pt-4 flex items-center justify-between border-t border-border/50">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <Library className="w-4 h-4 text-primary" />
                    {set.questionCount} Questions
                  </div>
                  <Link href={`/host/question-sets/${set.id}`}>
                    <Button variant="secondary" size="sm" className="gap-2">
                      <Settings className="w-4 h-4" />
                      Manage
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
              <Library className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <h3 className="text-xl font-bold mb-2">No question sets yet</h3>
              <p className="mb-4">Create your first set to start adding questions.</p>
              <Button onClick={() => setIsCreating(true)}>Create Question Set</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
