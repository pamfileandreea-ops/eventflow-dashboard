import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { MapPin, Clock, Users, Calendar, ExternalLink, ChevronRight, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import type { Event } from "@shared/schema";

const categoryLabel: Record<string, string> = {
  conference: "Conférence", workshop: "Atelier", networking: "Networking",
  webinar: "Webinaire", seminar: "Séminaire", other: "Autre",
};

function Step({ num, label, sub, icon: Icon, active }: { num: number; label: string; sub: string; icon: any; active?: boolean }) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${active ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card"}`}>
      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {num}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon size={14} className={active ? "text-primary" : "text-muted-foreground"} />
          <p className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{label}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{sub}</p>
      </div>
    </div>
  );
}

export default function ParcoursClient() {
  const params = useParams<{ id?: string }>();
  const { data: events } = useQuery<Event[]>({ queryKey: ["/api/events"] });
  const [selectedId, setSelectedId] = useState<string>(params.id || "");

  const eventId = selectedId ? Number(selectedId) : events?.[0]?.id;
  const event = events?.find(e => e.id === eventId) || events?.[0];

  const isLoading = !events;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Aucun événement trouvé.</p>
      </div>
    );
  }

  const duration = (() => {
    const [sh, sm] = event.startTime.split(":").map(Number);
    const [eh, em] = event.endTime.split(":").map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h${m > 0 ? m + "min" : ""}` : `${m}min`;
  })();

  const isFree = event.ticketPrice === 0;

  // Journey steps
  const journeySteps = [
    {
      num: 1,
      label: "Découverte",
      icon: Info,
      sub: `Le participant découvre « ${event.title} » via email, réseaux sociaux ou partenaire.`,
      active: false,
    },
    {
      num: 2,
      label: "Inscription",
      icon: Users,
      sub: `Inscription via ${event.platform} — formulaire en ligne, ${isFree ? "gratuit" : `${event.ticketPrice} ${event.currency}`}.`,
      active: true,
    },
    {
      num: 3,
      label: "Confirmation",
      icon: Calendar,
      sub: "Email de confirmation automatique avec QR code et lien iCal.",
      active: false,
    },
    {
      num: 4,
      label: "Accueil sur place",
      icon: MapPin,
      sub: `Accueil au ${event.location} — ${event.address}. Scan du QR code à l'entrée.`,
      active: false,
    },
    {
      num: 5,
      label: "Déroulé de l'événement",
      icon: Clock,
      sub: `De ${event.startTime} à ${event.endTime} (durée : ${duration}). ${categoryLabel[event.category] || event.category}.`,
      active: false,
    },
    {
      num: 6,
      label: "Suivi post-événement",
      icon: ChevronRight,
      sub: "Enquête de satisfaction, replay/ressources, invitation prochain événement.",
      active: false,
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-screen-lg">
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Parcours client</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visualisation du déroulé pour les participants</p>
        </div>
        {events && events.length > 1 && (
          <Select value={String(eventId)} onValueChange={setSelectedId}>
            <SelectTrigger className="w-64" data-testid="select-event">
              <SelectValue placeholder="Choisir un événement" />
            </SelectTrigger>
            <SelectContent>
              {events.map(e => (
                <SelectItem key={e.id} value={String(e.id)}>{e.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Event card */}
      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-accent/5 p-6 shadow-sm" data-testid="event-card">
        <div className="flex flex-wrap gap-4 items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
              {categoryLabel[event.category] || event.category}
            </p>
            <h2 className="text-lg font-bold text-foreground">{event.title}</h2>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">{event.description}</p>
            )}
          </div>
          <span className={`event-${event.status} status-pill`}>
            {event.status === "draft" ? "Brouillon" : event.status === "published" ? "Publié" : event.status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <InfoBlock icon={Calendar} label="Date" value={new Date(event.startDate).toLocaleDateString("fr-CH", { day: "2-digit", month: "long", year: "numeric" })} />
          <InfoBlock icon={Clock} label="Horaire" value={`${event.startTime} – ${event.endTime} (${duration})`} />
          <InfoBlock icon={MapPin} label="Lieu" value={event.location} sub={event.address} />
          <InfoBlock icon={Users} label="Capacité" value={`${event.capacity} places`} sub={isFree ? "Gratuit" : `${event.ticketPrice} ${event.currency}`} />
        </div>
      </div>

      {/* Journey map */}
      <div>
        <h2 className="font-semibold text-sm text-foreground mb-3">Étapes du parcours participant</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {journeySteps.map(s => (
            <Step key={s.num} {...s} />
          ))}
        </div>
      </div>

      {/* Access info */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h3 className="font-semibold text-sm">Informations pratiques</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Adresse</p>
            <p className="font-medium">{event.location}</p>
            <p className="text-muted-foreground">{event.address || "Adresse non renseignée"}</p>
            {event.address && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(event.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary text-xs hover:underline mt-1"
                data-testid="link-maps"
              >
                <MapPin size={11} /> Ouvrir dans Maps <ExternalLink size={10} />
              </a>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Accès</p>
            <p className="text-muted-foreground">Transports publics recommandés.</p>
            <p className="text-muted-foreground mt-1">Accueil ouvert 30 min avant le début.</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Billeterie / Inscription</p>
            <span className={`platform-${event.platform} status-pill`}>{event.platform}</span>
            <p className="text-muted-foreground mt-1">{isFree ? "Événement gratuit" : `${event.ticketPrice} ${event.currency} / personne`}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Contact organisation</p>
            <p className="text-muted-foreground">events@organisation.ch</p>
            <p className="text-muted-foreground">+41 21 000 00 00</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon size={15} className="text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}
