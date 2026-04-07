import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { insertRegistrationSchema, type InsertRegistration, type Registration, type Event } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Search, CheckCircle2, XCircle, Clock, UserCheck, Loader2, Download, FileText } from "lucide-react";
import { z } from "zod";

const regSchema = insertRegistrationSchema.extend({
  eventId: z.number().optional(),
  registeredAt: z.string().optional(),
}).omit({ eventId: true, registeredAt: true });

type RegForm = z.infer<typeof regSchema>;

const sourceLabel: Record<string, string> = {
  direct: "Direct", email: "Email", social: "Réseaux", partner: "Partenaire", ads: "Publicité", qr: "QR Code", linkedin: "LinkedIn",
};

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, { cls: string; label: string; icon: any }> = {
    confirmed:  { cls: "reg-confirmed",  label: "Confirmé",   icon: CheckCircle2 },
    pending:    { cls: "reg-pending",    label: "En attente", icon: Clock },
    cancelled:  { cls: "reg-cancelled", label: "Annulé",     icon: XCircle },
    attended:   { cls: "reg-attended",  label: "Présent",    icon: UserCheck },
  };
  const m = map[s] || { cls: "status-pill", label: s, icon: Users };
  return (
    <span className={`${m.cls} status-pill`}>
      <m.icon size={10} />
      {m.label}
    </span>
  );
}

export default function HubInscription() {
  const { data: events } = useQuery<Event[]>({ queryKey: ["/api/events"] });
  const [exportingPdf, setExportingPdf] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const eventId = selectedId ? Number(selectedId) : events?.[0]?.id;

  async function exportPdf() {
    if (!regs || !event) return;
    setExportingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(`Inscrits — ${event.title}`, 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Exporté le ${new Date().toLocaleDateString("fr-CH")} — ${regs.length} participants`, 14, 26);
      autoTable(doc, {
        startY: 32,
        head: [["Prénom", "Nom", "Email", "Société", "Billet", "Statut", "Canal", "Inscrit le"]],
        body: regs.map(r => [
          r.firstName, r.lastName, r.email, r.company || "—",
          r.ticketType, r.status, r.source,
          new Date(r.registeredAt).toLocaleDateString("fr-CH"),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [99, 88, 200] },
      });
      doc.save(`inscrits-${event.title.replace(/\s+/g, "-")}.pdf`);
    } finally {
      setExportingPdf(false);
    }
  }

  function exportCsv() {
    if (!eventId) return;
    window.location.href = `/api/events/${eventId}/export/csv`;
  }

  const { data: regs, isLoading } = useQuery<Registration[]>({
    queryKey: ["/api/events", eventId, "registrations"],
    queryFn: () => fetch(`/api/events/${eventId}/registrations`).then(r => r.json()),
    enabled: !!eventId,
  });

  const event = events?.find(e => e.id === eventId) || events?.[0];

  const form = useForm<RegForm>({
    resolver: zodResolver(regSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "", phone: "",
      company: "", ticketType: "standard", status: "confirmed", source: "direct", notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: RegForm) =>
      apiRequest("POST", `/api/events/${eventId}/registrations`, {
        ...data,
        eventId,
        registeredAt: new Date().toISOString(),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/events", eventId, "registrations"] });
      toast({ title: "Inscrit ajouté", description: "Participant enregistré avec succès." });
      form.reset();
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/registrations/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/events", eventId, "registrations"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/registrations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/events", eventId, "registrations"] }),
  });

  const filtered = regs?.filter(r =>
    [r.firstName, r.lastName, r.email, r.company].some(v =>
      v.toLowerCase().includes(search.toLowerCase())
    )
  ) ?? [];

  const confirmed  = regs?.filter(r => r.status === "confirmed").length ?? 0;
  const attended   = regs?.filter(r => r.status === "attended").length ?? 0;
  const pending    = regs?.filter(r => r.status === "pending").length ?? 0;
  const cancelled  = regs?.filter(r => r.status === "cancelled").length ?? 0;
  const total      = regs?.length ?? 0;
  const fillRate   = event ? Math.round((total / event.capacity) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Hub Inscription</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestion des participants et des listes</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {events && events.length > 1 && (
            <Select value={String(eventId)} onValueChange={setSelectedId}>
              <SelectTrigger className="w-56" data-testid="select-event-hub">
                <SelectValue placeholder="Événement" />
              </SelectTrigger>
              <SelectContent>
                {events.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.title}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
              title="Exporter en CSV (Excel)"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={exportPdf}
              disabled={exportingPdf}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
              title="Exporter en PDF"
            >
              {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} PDF
            </button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5" data-testid="button-add-reg">
                <Plus size={14} /> Ajouter un inscrit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nouvel inscrit</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-3 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom *</FormLabel>
                        <FormControl><Input data-testid="input-firstname" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom *</FormLabel>
                        <FormControl><Input data-testid="input-lastname" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl><Input data-testid="input-email" type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl><Input data-testid="input-phone" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="company" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Société</FormLabel>
                        <FormControl><Input data-testid="input-company" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="source" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Canal</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-source"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(sourceLabel).map(([v, l]) => (
                              <SelectItem key={v} value={v}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="ticketType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billet</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-ticket"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="vip">VIP</SelectItem>
                            <SelectItem value="speaker">Intervenant</SelectItem>
                            <SelectItem value="press">Presse</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                  <Button type="submit" size="sm" className="w-full mt-1" disabled={createMutation.isPending} data-testid="button-submit-reg">
                    {createMutation.isPending ? <><Loader2 size={14} className="animate-spin mr-1.5" />Enregistrement...</> : "Ajouter l'inscrit"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: total, icon: Users, color: "text-foreground" },
          { label: "Confirmés", value: confirmed, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Présents", value: attended, icon: UserCheck, color: "text-indigo-600 dark:text-indigo-400" },
          { label: "En attente", value: pending, icon: Clock, color: "text-yellow-600 dark:text-yellow-400" },
          { label: "Annulés", value: cancelled, icon: XCircle, color: "text-red-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card py-3 px-4" data-testid={`stat-reg-${label}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <Icon size={14} className={color} />
            </div>
            {isLoading ? <Skeleton className="h-6 w-12 mt-1" /> : (
              <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Fill rate bar */}
      {event && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Taux de remplissage</span>
            <span className="text-sm font-bold tabular-nums text-primary">{fillRate}% — {total} / {event.capacity}</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${fillRate >= 90 ? "bg-red-500" : fillRate >= 70 ? "bg-orange-500" : "bg-primary"}`}
              style={{ width: `${Math.min(fillRate, 100)}%` }}
              data-testid="fill-rate-bar"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0</span>
            <span>{event.capacity} places</span>
          </div>
        </div>
      )}

      {/* Search + table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="px-5 py-4 border-b flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              data-testid="input-search"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} résultat{filtered.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Participant", "Société", "Canal", "Billet", "Statut", "Date", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
                : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">Aucun participant trouvé.</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-reg-${r.id}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.firstName} {r.lastName}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.company || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{sourceLabel[r.source] || r.source}</span>
                    </td>
                    <td className="px-4 py-3 text-xs capitalize">{r.ticketType}</td>
                    <td className="px-4 py-3"><StatusBadge s={r.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {new Date(r.registeredAt).toLocaleDateString("fr-CH", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {r.status !== "attended" && (
                          <button
                            onClick={() => updateMutation.mutate({ id: r.id, status: "attended" })}
                            className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 transition-colors"
                            data-testid={`button-checkin-${r.id}`}
                          >
                            Check-in
                          </button>
                        )}
                        {r.status === "attended" && (
                          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">✓ Présent</span>
                        )}
                        <button
                          onClick={() => deleteMutation.mutate(r.id)}
                          className="text-xs px-1.5 py-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-1"
                          data-testid={`button-delete-${r.id}`}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
