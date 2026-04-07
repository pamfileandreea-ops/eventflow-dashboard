import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserCog, Plus, Trash2, Loader2, ShieldCheck, User } from "lucide-react";

interface UserRecord {
  id: number;
  email: string;
  name: string;
  role: string;
}

export default function Users() {
  const { user: currentUser, token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "member" });

  const headers = { Authorization: `Bearer ${token}` };

  const { data: users, isLoading } = useQuery<UserRecord[]>({
    queryKey: ["/api/auth/users"],
    queryFn: () =>
      fetch("/api/auth/users", { headers }).then(r => r.json()),
    enabled: currentUser?.role === "admin",
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(data),
      }).then(async r => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Erreur");
        return j;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/users"] });
      toast({ title: "Utilisateur créé", description: `${form.name} peut maintenant se connecter.` });
      setForm({ name: "", email: "", password: "", role: "member" });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/auth/users/${id}`, { method: "DELETE", headers }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/users"] });
      toast({ title: "Utilisateur supprimé" });
    },
  });

  if (currentUser?.role !== "admin") {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Gestion des utilisateurs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gérez les accès à EventFlow</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus size={14} /> Ajouter un utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Nouvel utilisateur</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Nom complet</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Marie Dupont" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="marie@exemple.ch" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Mot de passe</label>
                <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Rôle</label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Membre</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                disabled={createMutation.isPending || !form.name || !form.email || !form.password}
                onClick={() => createMutation.mutate(form)}
              >
                {createMutation.isPending ? <><Loader2 size={14} className="animate-spin mr-1.5" />Création...</> : "Créer l'utilisateur"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Chargement...</div>
        ) : !users || users.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Aucun utilisateur.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Utilisateur", "Email", "Rôle", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{u.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="font-medium">{u.name}</span>
                      {u.id === currentUser?.id && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Vous</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                      u.role === "admin"
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {u.role === "admin" ? <ShieldCheck size={11} /> : <User size={11} />}
                      {u.role === "admin" ? "Administrateur" : "Membre"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => deleteMutation.mutate(u.id)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Eventbrite API Settings */}
      <EventbriteSettings token={token} />
    </div>
  );
}

function EventbriteSettings({ token }: { token: string | null }) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [orgId, setOrgId] = useState("");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function testConnection() {
    if (!apiKey.trim()) return;
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch(`https://www.eventbriteapi.com/v3/users/me/?token=${apiKey.trim()}`);
      const data = await res.json();
      if (res.ok && data.id) {
        setResult({ ok: true, message: `Connecté en tant que ${data.name || data.email || "utilisateur Eventbrite"}` });
        toast({ title: "Connexion Eventbrite réussie", description: `Compte : ${data.name || data.email}` });
      } else {
        setResult({ ok: false, message: data.error_description || "Clé API invalide" });
      }
    } catch {
      setResult({ ok: false, message: "Impossible de contacter Eventbrite. Vérifiez votre connexion." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">EB</span>
        </div>
        <h2 className="text-base font-semibold">Connexion Eventbrite</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Entrez votre clé API Eventbrite pour synchroniser vos événements.{" "}
        <a href="https://www.eventbrite.com/account-settings/apps" target="_blank" rel="noreferrer" className="text-primary hover:underline">
          Obtenir une clé API →
        </a>
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Clé API Eventbrite (Private Token)</label>
          <Input
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXX"
            type="password"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">ID Organisation (optionnel)</label>
          <Input
            value={orgId}
            onChange={e => setOrgId(e.target.value)}
            placeholder="123456789"
          />
          <p className="text-xs text-muted-foreground mt-1">Requis pour créer des événements dans votre organisation.</p>
        </div>

        <Button onClick={testConnection} disabled={testing || !apiKey.trim()} variant="outline" className="gap-2">
          {testing ? <><Loader2 size={14} className="animate-spin" /> Test en cours...</> : "Tester la connexion"}
        </Button>

        {result && (
          <div className={`text-sm px-3 py-2 rounded-lg ${result.ok ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"}`}>
            {result.ok ? "✓ " : "✗ "}{result.message}
          </div>
        )}
      </div>

      <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Comment utiliser ?</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Connectez-vous à <a href="https://www.eventbrite.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">eventbrite.com</a></li>
          <li>Allez dans Compte → Apps &amp; Intégrations</li>
          <li>Créez un nouveau token privé</li>
          <li>Collez-le ci-dessus et testez la connexion</li>
        </ol>
      </div>
    </div>
  );
}
