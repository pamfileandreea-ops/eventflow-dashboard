import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema, type SprintTask, type InsertTask } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Kanban, Plus, Loader2, CircleDot, Circle, CheckCircle2, LayoutList } from "lucide-react";
import { z } from "zod";

type Status = "backlog" | "todo" | "in_progress" | "done";

const COLS: { id: Status; label: string; icon: any; cls: string }[] = [
  { id: "backlog",     label: "Backlog",    icon: LayoutList,    cls: "text-slate-500" },
  { id: "todo",        label: "À faire",    icon: Circle,        cls: "text-yellow-500" },
  { id: "in_progress", label: "En cours",  icon: CircleDot,     cls: "text-blue-500" },
  { id: "done",        label: "Terminé",   icon: CheckCircle2,  cls: "text-emerald-500" },
];

const PRIORITY: Record<string, { label: string; dot: string }> = {
  low:      { label: "Faible",  dot: "priority-low" },
  medium:   { label: "Moyen",   dot: "priority-medium" },
  high:     { label: "Haute",   dot: "priority-high" },
  critical: { label: "Critique", dot: "priority-critical" },
};

const taskSchema = insertTaskSchema.omit({ createdAt: true });
type TaskForm = z.infer<typeof taskSchema>;

export default function SprintBoard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);

  const { data: tasks, isLoading } = useQuery<SprintTask[]>({ queryKey: ["/api/tasks"] });

  const form = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "", description: "", status: "backlog",
      priority: "medium", assignee: "", storyPoints: 1, sprint: 1,
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: TaskForm) => apiRequest("POST", "/api/tasks", { ...d, createdAt: new Date().toISOString() }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Tâche créée" });
      form.reset();
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...rest }: Partial<SprintTask> & { id: number }) => apiRequest("PATCH", `/api/tasks/${id}`, rest),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/tasks"] }),
  });

  const byStatus = (s: Status) => tasks?.filter(t => t.status === s) ?? [];

  const totalPoints = tasks?.reduce((a, t) => a + (t.storyPoints || 0), 0) ?? 0;
  const donePoints = tasks?.filter(t => t.status === "done").reduce((a, t) => a + (t.storyPoints || 0), 0) ?? 0;
  const velocity = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

  const handleDrop = (col: Status) => {
    if (dragId === null) return;
    updateMutation.mutate({ id: dragId, status: col });
    setDragId(null);
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Kanban size={20} className="text-primary" /> Sprint agile
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kanban board — pilotage des tâches</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Velocity */}
          <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2 text-sm">
            <span className="text-muted-foreground text-xs">Vélocité sprint</span>
            <span className="font-bold text-primary tabular-nums">{velocity}%</span>
            <span className="text-xs text-muted-foreground">({donePoints}/{totalPoints} pts)</span>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5" data-testid="button-add-task">
                <Plus size={14} /> Nouvelle tâche
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Créer une tâche</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-3 mt-2">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre *</FormLabel>
                      <FormControl><Input data-testid="input-task-title" placeholder="Envoyer les invitations…" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea rows={2} data-testid="input-task-desc" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="priority" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priorité</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-priority"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(PRIORITY).map(([v, l]) => (
                              <SelectItem key={v} value={v}>{l.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="storyPoints" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Story points</FormLabel>
                        <FormControl>
                          <Input data-testid="input-points" type="number" min={1} max={13} {...field} onChange={e => field.onChange(Number(e.target.value))} />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="assignee" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsable</FormLabel>
                        <FormControl><Input data-testid="input-assignee" placeholder="Sophie…" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="sprint" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sprint</FormLabel>
                        <FormControl>
                          <Input data-testid="input-sprint" type="number" min={1} {...field} onChange={e => field.onChange(Number(e.target.value))} />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <Button type="submit" size="sm" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-task">
                    {createMutation.isPending ? <><Loader2 size={14} className="animate-spin mr-1.5" />Création...</> : "Créer la tâche"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {COLS.map(col => {
          const items = byStatus(col.id);
          return (
            <div
              key={col.id}
              className="kanban-col"
              data-testid={`col-${col.id}`}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(col.id)}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 px-1 mb-1">
                <col.icon size={14} className={col.cls} />
                <span className="text-xs font-semibold text-foreground">{col.label}</span>
                <span className="ml-auto text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 tabular-nums">{items.length}</span>
              </div>

              {/* Cards */}
              {isLoading
                ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
                : items.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => setDragId(task.id)}
                    className="kanban-card"
                    data-testid={`task-${task.id}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-semibold text-foreground leading-snug">{task.title}</p>
                      <button
                        onClick={() => deleteMutation.mutate(task.id)}
                        className="text-muted-foreground/40 hover:text-red-400 transition-colors text-xs shrink-0"
                        data-testid={`button-delete-task-${task.id}`}
                      >✕</button>
                    </div>
                    {task.description && (
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className={`text-[10px] font-bold ${PRIORITY[task.priority]?.dot ?? "text-muted-foreground"}`}>
                        ● {PRIORITY[task.priority]?.label ?? task.priority}
                      </span>
                      <span className="sprint-badge">S{task.sprint}</span>
                      <span className="ml-auto text-[10px] bg-primary/10 text-primary rounded px-1 py-0.5 font-mono tabular-nums">{task.storyPoints}pt</span>
                    </div>
                    {task.assignee && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold uppercase">
                          {task.assignee.charAt(0)}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{task.assignee}</span>
                      </div>
                    )}
                    {/* Quick status move */}
                    <div className="mt-2 flex gap-1">
                      {COLS.filter(c => c.id !== col.id).map(c => (
                        <button
                          key={c.id}
                          onClick={() => updateMutation.mutate({ id: task.id, status: c.id })}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                          data-testid={`move-${task.id}-${c.id}`}
                        >
                          → {c.label.substring(0, 6)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              }

              {/* Drop hint when empty */}
              {items.length === 0 && !isLoading && (
                <div className="flex-1 border-2 border-dashed border-border/50 rounded-lg flex items-center justify-center min-h-[80px]">
                  <p className="text-xs text-muted-foreground/50">Glisser ici</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
