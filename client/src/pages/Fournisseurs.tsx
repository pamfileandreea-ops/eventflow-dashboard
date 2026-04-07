import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { type Supplier, type Event } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Music, UtensilsCrossed, Wine, Gamepad2, Package,
  Plus, Pencil, Trash2, ExternalLink, Phone, Mail, Loader2, ChevronDown
} from "lucide-react";

// ── Category config ────────────────────────────────────────────────────────
const CATEGORIES: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  venue:    { label: "Établissement",      icon: Building2,      color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-100 dark:bg-blue-900/30" },
  music:    { label: "Musique",            icon: Music,          color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30" },
  food:     { label: "Nourriture",         icon: UtensilsCrossed,color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" },
  drinks:   { label: "Boissons",           icon: Wine,           color: "text-rose-600 dark:text-rose-400",    bg: "bg-rose-100 dark:bg-rose-900/30" },
  activity: { label: "Activités ludiques", icon: Gamepad2,       color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  other:    { label: "Autre",              icon: Package,        color: "text-muted-foreground",               bg: "bg-muted" },
};

const STATUSES: Record<string, { label: string; cls: string }> = {
  prospect:  { label: "Prospect",   cls: "bg-muted text-muted-foreground" },
  contacté:  { label: "Contacté",   cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  confirmé:  { label: "Confirmé",   cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  annulé:    { label: "Annulé",     cls: "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400" },
};

const EMPTY_FORM = {
  name: "", category: "venue", contactName: "", email: "",
  phone: "", website: "", status: "prospect", budget: "", notes: "",
};

function StatusBadge({ s }: { s: string }) {
  const st = STATUSES[s] || { label: s, cls: "bg-muted text-muted-foreground" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>;
}

export default function Fournisseurs() {
  const { data: events } = useQuery<Event[]>({ queryKey: ["/api/events"] });
  const [selectedId, setSelectedId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const qc = useQueryClient();
  const { toast } = useToast();

  const eventId = selectedId ? Number(selectedId) : events?.[0]?.id;
  const event = events?.find(e => e.id === eventId) || events?.[0];

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/events", eventId, "suppliers"],
    queryFn: () => fetch(`/api/events/${eventId}/suppliers`).then(r => r.json()),
    enabled: !!eventId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/events/${eventId}/suppliers`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/events", eventId, "suppliers"] });
      toast({ title: "Prestataire ajouté" });
      setForm({ ...EMPTY_FORM });
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/suppliers/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/events", eventId, "suppliers"] });
      toast({ title: "Prestataire mis à jour" });
      setEditing(null);
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/suppliers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/events", eventId, "suppliers"] });
      toast({ title: "Prestataire supprimé" });
    },
  });

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({
      name: s.name, category: s.category, contactName: s.contactName,
      email: s.email, phone: s.phone, website: s.website,
      status: s.status, budget: String(s.budget || ""), notes: s.notes,
    });
    setOpen(true);
  }

  function handleSubmit() {
    const payload = { ...form, budget: Number(form.budget) || 0 };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  // Group suppliers by category
  const grouped = suppliers?.reduce((acc: Record<string, Supplier[]>, s) => {
    const cat = s.category in CATEGORIES ? s.category : "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {}) || {};

  // Budget total
  const totalBudget = suppliers?.reduce((sum, s) => sum + (s.budget || 0), 0) ?? 0;
  const confirmedBudget = suppliers?.filter(s => s.status === "confirmé").reduce((sum, s) => sum + (s.budget || 0), 0) ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">

      {/* Header */}
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Fournisseurs & Partenaires</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gérez vos prestataires par événement</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {events && events.length > 1 && (
            <Select value={String(eventId)} onValueChange={setSelectedId}>
              <SelectTrigger className="w-60">
                <SelectValue placeholder="Événement" />
              </SelectTrigger>
              <SelectContent>
                {events.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.title}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" className="gap-1.5" onClick={openNew}>
            <Plus size={14} /> Ajouter un prestataire
          </Button>
        </div>
      </div>

      {/* Budget summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Prestataires", value: suppliers?.length ?? 0, sub: "au total", color: "text-foreground" },
          { label: "Budget total", value: `CHF ${totalBudget.toLocaleString("fr-CH")}`, sub: "estimé", color: "text-foreground" },
          { label: "Confirmés", value: suppliers?.filter(s => s.status === "confirmé").length ?? 0, sub: "prestataires", color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Confirmé CHF", value: `CHF ${confirmedBudget.toLocaleString("fr-CH")}`, sub: "engagé", color: "text-emerald-600 dark:text-emerald-400" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="stat-card py-3 px-4">
            <span className="text-xs text-muted-foreground">{label}</span>
            {isLoading
              ? <Skeleton className="h-6 w-20 mt-1" />
              : <p className={`text-xl font-bold tabular-nums mt-0.5 ${color}`}>{value}</p>
            }
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Grouped cards */}
      {isLoading ? (
        <div className="grid gap-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : !suppliers || suppliers.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground text-sm">
          <Package size={32} className="mx-auto mb-3 opacity-30" />
          Aucun prestataire pour cet événement.<br />
          <button onClick={openNew} className="mt-2 text-primary hover:underline text-sm">Ajouter le premier prestataire →</button>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(CATEGORIES).map(([catKey, catMeta]) => {
            const items = grouped[catKey];
            if (!items || items.length === 0) return null;
            const Icon = catMeta.icon;
            return (
              <div key={catKey}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${catMeta.bg}`}>
                    <Icon size={15} className={catMeta.color} />
                  </div>
                  <h2 className="text-sm font-semibold">{catMeta.label}</h2>
                  <span className="text-xs text-muted-foreground ml-1">({items.length})</span>
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(s => (
                    <div key={s.id} className="rounded-xl border bg-card shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{s.name}</p>
                          {s.contactName && <p className="text-xs text-muted-foreground truncate">{s.contactName}</p>}
                        </div>
                        <StatusBadge s={s.status} />
                      </div>

                      {/* Contact info */}
                      <div className="space-y-1">
                        {s.email && (
                          <a href={`mailto:${s.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors truncate">
                            <Mail size={11} /> {s.email}
                          </a>
                        )}
                        {s.phone && (
                          <a href={`tel:${s.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                            <Phone size={11} /> {s.phone}
                          </a>
                        )}
                        {s.website && (
                          <a href={s.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors truncate">
                            <ExternalLink size={11} /> {s.website.replace(/^https?:\/\//, "")}
                          </a>
                        )}
                      </div>

                      {/* Budget */}
                      {s.budget > 0 && (
                        <div className="text-xs font-medium text-foreground">
                          Budget : <span className="text-primary">{s.currency} {s.budget.toLocaleString("fr-CH")}</span>
                        </div>
                      )}

                      {/* Notes */}
                      {s.notes && (
                        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5 leading-relaxed line-clamp-2">{s.notes}</p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 mt-auto pt-1 border-t border-border">
                        {/* Quick status change */}
                        <select
                          value={s.status}
                          onChange={e => updateMutation.mutate({ id: s.id, data: { status: e.target.value } })}
                          className="flex-1 text-xs border border-border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring/50"
                        >
                          {Object.entries(STATUSES).map(([v, st]) => (
                            <option key={v} value={v}>{st.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="Modifier"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(s.id)}
                          className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-muted-foreground hover:text-red-500"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le prestataire" : "Nouveau prestataire"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">Nom du prestataire *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Traiteur Excellence SA" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Catégorie</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([v, c]) => (
                      <SelectItem key={v} value={v}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Statut</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUSES).map(([v, st]) => (
                      <SelectItem key={v} value={v}>{st.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Personne de contact</label>
                <Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Marie Dupont" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Budget (CHF)</label>
                <Input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" min="0" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@exemple.ch" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Téléphone</label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+41 21 000 00 00" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">Site web</label>
                <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://exemple.ch" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
                  rows={3}
                  placeholder="Informations complémentaires, conditions, remarques..."
                />
              </div>
            </div>
            <Button
              className="w-full"
              disabled={createMutation.isPending || updateMutation.isPending || !form.name.trim()}
              onClick={handleSubmit}
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? <><Loader2 size={14} className="animate-spin mr-1.5" />Enregistrement...</>
                : editing ? "Mettre à jour" : "Ajouter le prestataire"
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
