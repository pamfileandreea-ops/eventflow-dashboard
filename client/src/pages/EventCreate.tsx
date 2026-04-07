import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { insertEventSchema, type InsertEvent } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, CalendarDays, MapPin, Users, Settings, Zap } from "lucide-react";

const schema = insertEventSchema.extend({});

type Step = "details" | "location" | "capacity" | "platform" | "review";
const STEPS: Step[] = ["details", "location", "capacity", "platform", "review"];

const stepMeta: Record<Step, { label: string; icon: any; desc: string }> = {
  details:  { label: "Détails",  icon: CalendarDays, desc: "Nom, date, heure, catégorie" },
  location: { label: "Lieu",     icon: MapPin,       desc: "Adresse et salle" },
  capacity: { label: "Capacité", icon: Users,        desc: "Nombre de places et tarif" },
  platform: { label: "Plateforme", icon: Zap,        desc: "Publication et intégration" },
  review:   { label: "Résumé",   icon: CheckCircle2, desc: "Confirmer et créer" },
};

export default function EventCreate() {
  const [step, setStep] = useState<Step>("details");
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const form = useForm<InsertEvent>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "", description: "", location: "", address: "",
      startDate: "", endDate: "", startTime: "09:00", endTime: "18:00",
      category: "conference", capacity: 100, ticketPrice: 0, currency: "CHF",
      status: "draft", platform: "eventbrite", coverImage: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: InsertEvent) => apiRequest("POST", "/api/events", data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Événement créé", description: "Brouillon enregistré avec succès." });
      setLocation("/");
    },
    onError: () => toast({ title: "Erreur", description: "Impossible de créer l'événement.", variant: "destructive" }),
  });

  const stepIdx = STEPS.indexOf(step);
  const next = () => setStep(STEPS[Math.min(stepIdx + 1, STEPS.length - 1)]);
  const prev = () => setStep(STEPS[Math.max(stepIdx - 1, 0)]);

  const vals = form.watch();

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Créer un événement</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Assistant pas à pas — style agile</p>
      </div>

      {/* Step progress */}
      <div className="flex gap-2">
        {STEPS.map((s, i) => {
          const { label, icon: Icon } = stepMeta[s];
          const done = i < stepIdx;
          const active = s === step;
          return (
            <button
              key={s}
              onClick={() => setStep(s)}
              data-testid={`step-${s}`}
              className={`flex-1 flex flex-col items-center gap-1 rounded-xl p-2.5 border transition-all text-xs font-medium ${
                active ? "border-primary bg-primary/8 text-primary" :
                done ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700/50 dark:bg-green-900/20 dark:text-green-400" :
                "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {done ? <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" /> : <Icon size={16} />}
              <span className="hidden sm:block">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="space-y-4">
            {/* Step: details */}
            {step === "details" && (
              <>
                <p className="text-sm text-muted-foreground mb-1">Informations principales de l'événement</p>
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre de l'événement *</FormLabel>
                    <FormControl><Input data-testid="input-title" placeholder="Forum Digital Romand 2026" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea data-testid="input-description" placeholder="Décrivez votre événement..." rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de début *</FormLabel>
                      <FormControl><Input data-testid="input-start-date" type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de fin *</FormLabel>
                      <FormControl><Input data-testid="input-end-date" type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="startTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heure début</FormLabel>
                      <FormControl><Input data-testid="input-start-time" type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="endTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heure fin</FormLabel>
                      <FormControl><Input data-testid="input-end-time" type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Choisir" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="conference">Conférence</SelectItem>
                        <SelectItem value="workshop">Atelier / Workshop</SelectItem>
                        <SelectItem value="networking">Networking</SelectItem>
                        <SelectItem value="webinar">Webinaire</SelectItem>
                        <SelectItem value="seminar">Séminaire</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            )}

            {/* Step: location */}
            {step === "location" && (
              <>
                <p className="text-sm text-muted-foreground mb-1">Lieu et accès</p>
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du lieu *</FormLabel>
                    <FormControl><Input data-testid="input-location" placeholder="SwissTech Convention Center" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse complète</FormLabel>
                    <FormControl><Input data-testid="input-address" placeholder="Route Louis-Favre 2, 1024 Ecublens" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            )}

            {/* Step: capacity */}
            {step === "capacity" && (
              <>
                <p className="text-sm text-muted-foreground mb-1">Gestion des places et tarification</p>
                <FormField control={form.control} name="capacity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacité (places) *</FormLabel>
                    <FormControl><Input data-testid="input-capacity" type="number" min={1} {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="ticketPrice" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix du billet</FormLabel>
                      <FormControl><Input data-testid="input-price" type="number" min={0} step={0.01} placeholder="0" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Devise</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-currency">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CHF">CHF</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
              </>
            )}

            {/* Step: platform */}
            {step === "platform" && (
              <>
                <p className="text-sm text-muted-foreground mb-1">Choisissez la plateforme d'inscription</p>
                <FormField control={form.control} name="platform" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plateforme</FormLabel>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      {[
                        { value: "eventbrite", label: "Eventbrite", desc: "Intégration API v3", color: "text-orange-600" },
                        { value: "cvent", label: "Cvent", desc: "Enterprise events", color: "text-blue-600" },
                        { value: "bizzabo", label: "Bizzabo", desc: "B2B events & analytics", color: "text-violet-600" },
                        { value: "manual", label: "Manuel", desc: "Sans plateforme externe", color: "text-slate-500" },
                      ].map(p => (
                        <button
                          key={p.value}
                          type="button"
                          data-testid={`platform-${p.value}`}
                          onClick={() => field.onChange(p.value)}
                          className={`rounded-xl border p-4 text-left transition-all ${
                            field.value === p.value
                              ? "border-primary bg-primary/8 shadow-sm"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <p className={`font-semibold text-sm ${p.color}`}>{p.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                        </button>
                      ))}
                    </div>
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut initial</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Brouillon</SelectItem>
                        <SelectItem value="published">Publier maintenant</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </>
            )}

            {/* Step: review */}
            {step === "review" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-1">Récapitulatif avant création</p>
                <div className="rounded-xl bg-muted/50 border p-4 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground text-xs">Titre</span><p className="font-medium">{vals.title || "—"}</p></div>
                    <div><span className="text-muted-foreground text-xs">Catégorie</span><p className="font-medium capitalize">{vals.category}</p></div>
                    <div><span className="text-muted-foreground text-xs">Date</span><p className="font-medium">{vals.startDate} {vals.startTime} → {vals.endTime}</p></div>
                    <div><span className="text-muted-foreground text-xs">Lieu</span><p className="font-medium">{vals.location || "—"}</p></div>
                    <div><span className="text-muted-foreground text-xs">Capacité</span><p className="font-medium">{vals.capacity} places</p></div>
                    <div><span className="text-muted-foreground text-xs">Tarif</span><p className="font-medium">{vals.ticketPrice === 0 ? "Gratuit" : `${vals.ticketPrice} ${vals.currency}`}</p></div>
                    <div><span className="text-muted-foreground text-xs">Plateforme</span><p className="font-medium capitalize">{vals.platform}</p></div>
                    <div><span className="text-muted-foreground text-xs">Statut</span><p className="font-medium capitalize">{vals.status}</p></div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" size="sm" onClick={prev} disabled={stepIdx === 0} data-testid="button-prev">
                Précédent
              </Button>
              {step !== "review" ? (
                <Button type="button" size="sm" onClick={next} data-testid="button-next">Suivant</Button>
              ) : (
                <Button type="submit" size="sm" disabled={mutation.isPending} data-testid="button-submit">
                  {mutation.isPending ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Création...</> : "Créer l'événement"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
