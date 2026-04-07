import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Event, AcquisitionChannel } from "@shared/schema";
import { TrendingUp, MousePointerClick, UserCheck, DollarSign, Percent } from "lucide-react";

const channelMeta: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  email:    { label: "Email",         color: "bg-blue-500",   bg: "bg-blue-100 dark:bg-blue-900/30",   emoji: "✉️" },
  linkedin: { label: "LinkedIn",      color: "bg-indigo-500", bg: "bg-indigo-100 dark:bg-indigo-900/30", emoji: "💼" },
  website:  { label: "Site web",      color: "bg-violet-500", bg: "bg-violet-100 dark:bg-violet-900/30", emoji: "🌐" },
  partner:  { label: "Partenaires",   color: "bg-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30", emoji: "🤝" },
  ads:      { label: "Publicité",     color: "bg-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30", emoji: "📣" },
  qr:       { label: "QR Code",       color: "bg-pink-500",   bg: "bg-pink-100 dark:bg-pink-900/30",   emoji: "📱" },
  social:   { label: "Réseaux soc.",  color: "bg-teal-500",   bg: "bg-teal-100 dark:bg-teal-900/30",   emoji: "💬" },
  direct:   { label: "Direct",        color: "bg-slate-500",  bg: "bg-slate-100 dark:bg-slate-700/40", emoji: "🔗" },
};

function getC(c: string) { return channelMeta[c] || { label: c, color: "bg-slate-400", bg: "bg-slate-100", emoji: "📌" }; }

export default function Acquisition() {
  const { data: events } = useQuery<Event[]>({ queryKey: ["/api/events"] });
  const [selectedId, setSelectedId] = useState<string>("");

  // Default to first event that has channel data, else first event
  const eventId = selectedId ? Number(selectedId) : (events?.slice().reverse()?.[0]?.id);
  const { data: channels, isLoading } = useQuery<AcquisitionChannel[]>({
    queryKey: ["/api/events", eventId, "channels"],
    queryFn: () => fetch(`/api/events/${eventId}/channels`).then(r => r.json()),
    enabled: !!eventId,
  });

  const totalClicks = channels?.reduce((s, c) => s + c.clicks, 0) ?? 0;
  const totalRegs   = channels?.reduce((s, c) => s + c.registrations, 0) ?? 0;
  const totalSpend  = channels?.reduce((s, c) => s + c.spend, 0) ?? 0;
  const overallConv = totalClicks > 0 ? ((totalRegs / totalClicks) * 100).toFixed(1) : "0.0";

  const maxRegs = Math.max(...(channels?.map(c => c.registrations) ?? [1]), 1);
  const sorted = [...(channels ?? [])].sort((a, b) => b.registrations - a.registrations);

  const event = events?.find(e => e.id === eventId) || events?.[0];

  return (
    <div className="p-6 space-y-6 max-w-screen-lg">
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Acquisition</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Performance par canal de recrutement</p>
        </div>
        {events && events.length > 1 && (
          <Select value={String(eventId)} onValueChange={setSelectedId}>
            <SelectTrigger className="w-64" data-testid="select-event-acq">
              <SelectValue placeholder="Événement" />
            </SelectTrigger>
            <SelectContent>
              {events.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.title}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Clics totaux",       value: totalClicks.toLocaleString("fr"), icon: MousePointerClick, color: "text-blue-600 dark:text-blue-400" },
          { label: "Inscriptions",        value: totalRegs.toLocaleString("fr"),   icon: UserCheck,         color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Taux de conversion", value: `${overallConv} %`,               icon: Percent,           color: "text-violet-600 dark:text-violet-400" },
          { label: "Budget dépensé",     value: `${totalSpend.toLocaleString("fr")} CHF`, icon: DollarSign, color: "text-orange-600 dark:text-orange-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card" data-testid={`stat-acq-${label}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
              <Icon size={16} className={color} />
            </div>
            {isLoading ? <Skeleton className="h-7 w-24 mt-1" /> : (
              <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Channel breakdown */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" />
          <h2 className="font-semibold text-sm">Canaux d'acquisition</h2>
          {event && <span className="text-xs text-muted-foreground ml-1">— {event.title}</span>}
        </div>
        <div className="divide-y">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 flex-1 ml-auto" />
              </div>
            ))
            : sorted.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">Aucune donnée d'acquisition disponible.</p>
            ) : sorted.map(ch => {
              const meta = getC(ch.channel);
              const pct = (ch.registrations / maxRegs) * 100;
              const cpa = ch.spend > 0 ? (ch.spend / ch.registrations).toFixed(0) : null;
              return (
                <div key={ch.id} className="px-5 py-4" data-testid={`channel-${ch.channel}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center text-base shrink-0`}>
                      {meta.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-medium text-sm">{meta.label}</span>
                        <div className="flex items-center gap-4 text-xs tabular-nums text-muted-foreground">
                          <span><span className="font-semibold text-foreground">{ch.clicks.toLocaleString("fr")}</span> clics</span>
                          <span><span className="font-semibold text-foreground">{ch.registrations}</span> inscrits</span>
                          <span className="font-semibold text-violet-600 dark:text-violet-400">{ch.conversionRate.toFixed(1)}%</span>
                          {cpa && <span className="text-orange-600 dark:text-orange-400">{cpa} CHF/inscrit</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Bar */}
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`channel-bar ${meta.color}`}
                      style={{ width: `${pct}%` }}
                      data-testid={`bar-${ch.channel}`}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Funnel insight */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="font-semibold text-sm mb-4">Entonnoir de conversion</h3>
        <div className="flex items-end gap-1 h-28 overflow-x-auto pb-2">
          {sorted.map(ch => {
            const meta = getC(ch.channel);
            const hPct = totalRegs > 0 ? (ch.registrations / totalRegs) * 100 : 0;
            return (
              <div key={ch.id} className="flex flex-col items-center gap-1.5 min-w-[50px] flex-1">
                <span className="text-xs font-semibold tabular-nums text-foreground">{ch.registrations}</span>
                <div className="w-full flex items-end justify-center" style={{ height: "70px" }}>
                  <div
                    className={`w-full max-w-[36px] rounded-t-lg ${meta.color} opacity-80`}
                    style={{ height: `${Math.max(hPct, 4)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">{meta.emoji} {meta.label.split(" ")[0]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
