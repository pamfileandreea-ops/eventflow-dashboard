import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Calendar, Users, TrendingUp, CheckCircle2, Plus, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Event } from "@shared/schema";

function statusClass(s: string) {
  return `event-${s} status-pill`;
}

function statusLabel(s: string) {
  const map: Record<string, string> = { draft: "Brouillon", published: "Publié", completed: "Terminé", cancelled: "Annulé" };
  return map[s] || s;
}

function platformClass(p: string) { return `platform-${p} status-pill`; }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-CH", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Dashboard() {
  const { data: events, isLoading } = useQuery<Event[]>({ queryKey: ["/api/events"] });

  const published = events?.filter(e => e.status === "published").length ?? 0;
  const drafts = events?.filter(e => e.status === "draft").length ?? 0;
  const totalCapacity = events?.reduce((s, e) => s + e.capacity, 0) ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Vue d'ensemble de vos événements</p>
        </div>
        <Link href="/events/new">
          <Button data-testid="button-create-event" size="sm" className="gap-2">
            <Plus size={15} /> Nouvel événement
          </Button>
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Événements actifs", value: published, icon: Calendar, color: "text-primary", sub: "publiés" },
          { label: "Brouillons", value: drafts, icon: Clock, color: "text-muted-foreground", sub: "en cours" },
          { label: "Capacité totale", value: totalCapacity.toLocaleString("fr"), icon: Users, color: "text-violet-600 dark:text-violet-400", sub: "places" },
          { label: "Événements total", value: events?.length ?? 0, icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400", sub: "tous statuts" },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="stat-card" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
              <Icon size={16} className={color} />
            </div>
            {isLoading
              ? <Skeleton className="h-8 w-20 mt-1" />
              : <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
            }
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Events table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-sm text-foreground">Événements récents</h2>
          <Link href="/events/new">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7 px-2">
              <Plus size={13} /> Ajouter
            </Button>
          </Link>
        </div>
        <div className="divide-y">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex gap-4 items-center">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            ))
          ) : events?.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted-foreground text-sm">
              Aucun événement. <Link href="/events/new"><a className="text-primary underline">Créez le premier.</a></Link>
            </div>
          ) : (
            events?.map(event => (
              <div key={event.id} className="px-5 py-4 flex flex-wrap gap-3 items-center hover:bg-muted/30 transition-colors" data-testid={`row-event-${event.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                    <Calendar size={11} /> {formatDate(event.startDate)} &middot; {event.startTime} &rarr; {event.endTime}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground hidden md:flex items-center gap-1 truncate max-w-[180px]">
                  <span>{event.location}</span>
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={statusClass(event.status)}>{statusLabel(event.status)}</span>
                  <span className={platformClass(event.platform)}>{event.platform}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{event.capacity} places</span>
                </div>
                <div className="flex gap-1.5">
                  <Link href={`/parcours/${event.id}`}>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" data-testid={`button-parcours-${event.id}`}>
                      <ExternalLink size={12} /> Parcours
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { href: "/parcours", label: "Voir le parcours client", desc: "Lieu, horaire, déroulé", icon: "🗺️" },
          { href: "/acquisition", label: "Analyser l'acquisition", desc: "Canaux & conversion", icon: "📊" },
          { href: "/inscriptions", label: "Gérer les inscriptions", desc: "Hub participants", icon: "📋" },
        ].map(card => (
          <Link key={card.href} href={card.href}>
            <a className="rounded-xl border bg-card p-4 hover:bg-muted/40 transition-colors group cursor-pointer block" data-testid={`card-quicklink-${card.label}`}>
              <div className="text-2xl mb-2">{card.icon}</div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{card.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
