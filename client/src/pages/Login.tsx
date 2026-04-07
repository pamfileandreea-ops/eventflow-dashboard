import { useState } from "react";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("admin@eventflow.ch");
  const [password, setPassword] = useState("eventflow2026");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de connexion");
      login(data.token, data.user);
    } catch (err: any) {
      toast({ title: "Connexion impossible", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Calendar size={20} className="text-primary-foreground" />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">EventFlow</p>
            <p className="text-xs text-muted-foreground">Gestion d'événements</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card shadow-lg p-7">
          <h1 className="text-xl font-bold mb-1">Connexion</h1>
          <p className="text-sm text-muted-foreground mb-6">Accédez à votre espace EventFlow</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@exemple.ch"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Mot de passe</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 size={15} className="animate-spin mr-2" />Connexion...</> : "Se connecter"}
            </Button>
          </form>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-4 rounded-xl border bg-muted/50 p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">Identifiants démo</p>
          <p>Email : <span className="font-mono text-foreground">admin@eventflow.ch</span></p>
          <p>Mot de passe : <span className="font-mono text-foreground">eventflow2026</span></p>
        </div>
      </div>
    </div>
  );
}
