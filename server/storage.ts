import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  events, registrations, acquisitionChannels, sprintTasks, users, suppliers,
  type Event, type InsertEvent,
  type Registration, type InsertRegistration,
  type AcquisitionChannel, type InsertChannel,
  type SprintTask, type InsertTask,
  type User, type InsertUser,
  type Supplier, type InsertSupplier,
} from "@shared/schema";

const sqlite = new Database("event_dashboard.db");
const db = drizzle(sqlite);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'conference',
    capacity INTEGER NOT NULL DEFAULT 100,
    cover_image TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    platform TEXT NOT NULL DEFAULT 'eventbrite',
    external_id TEXT,
    external_url TEXT,
    ticket_price REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'CHF'
  );
  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    ticket_type TEXT NOT NULL DEFAULT 'standard',
    status TEXT NOT NULL DEFAULT 'confirmed',
    source TEXT NOT NULL DEFAULT 'direct',
    registered_at TEXT NOT NULL,
    checked_in_at TEXT,
    notes TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS acquisition_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    channel TEXT NOT NULL,
    clicks INTEGER NOT NULL DEFAULT 0,
    registrations INTEGER NOT NULL DEFAULT 0,
    conversion_rate REAL NOT NULL DEFAULT 0,
    spend REAL NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS sprint_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'backlog',
    priority TEXT NOT NULL DEFAULT 'medium',
    assignee TEXT NOT NULL DEFAULT '',
    story_points INTEGER NOT NULL DEFAULT 1,
    sprint INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    due_date TEXT
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    contact_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    website TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'prospect',
    budget REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'CHF',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
`);

// Seed demo data if empty
const existing = db.select().from(events).all();
if (existing.length === 0) {
  const e1 = db.insert(events).values({
    title: "Forum Digital Romand 2026",
    description: "Conférence annuelle sur la transformation numérique en Suisse romande.",
    location: "SwissTech Convention Center, EPFL",
    address: "Route Louis-Favre 2, 1024 Ecublens",
    startDate: "2026-05-15", endDate: "2026-05-15",
    startTime: "09:00", endTime: "18:00",
    category: "conference", capacity: 350,
    status: "published", platform: "eventbrite",
    ticketPrice: 0, currency: "CHF",
  }).returning().get();

  const e2 = db.insert(events).values({
    title: "Atelier IA & Juridique",
    description: "Workshop pratique sur l'intelligence artificielle dans le droit.",
    location: "Espace Coworking Flon, Lausanne",
    address: "Av. du Flon 6, 1003 Lausanne",
    startDate: "2026-06-03", endDate: "2026-06-03",
    startTime: "14:00", endTime: "17:30",
    category: "workshop", capacity: 40,
    status: "draft", platform: "manual",
    ticketPrice: 120, currency: "CHF",
  }).returning().get();

  db.insert(events).values({
    title: "Networking Fiduciaire Romand",
    description: "Soirée de networking pour les professionnels de la fiducie.",
    location: "Hôtel de la Paix, Genève",
    address: "Quai du Mont-Blanc 11, 1201 Genève",
    startDate: "2026-06-20", endDate: "2026-06-20",
    startTime: "18:30", endTime: "21:00",
    category: "networking", capacity: 80,
    status: "published", platform: "bizzabo",
    ticketPrice: 45, currency: "CHF",
  }).run();

  const regs = [
    { firstName: "Sophie", lastName: "Müller", email: "s.muller@example.ch", company: "Nestlé SA", source: "email", status: "confirmed" },
    { firstName: "Jean-Pierre", lastName: "Dubois", email: "jp.dubois@fiducie.ch", company: "Etude Dubois & Partners", source: "linkedin", status: "confirmed" },
    { firstName: "Laetitia", lastName: "Blanc", email: "l.blanc@startup.ch", company: "TechRomand Sàrl", source: "website", status: "confirmed" },
    { firstName: "Marc", lastName: "Schneider", email: "m.schneider@law.ch", company: "Cabinet Schneider", source: "partner", status: "pending" },
    { firstName: "Isabelle", lastName: "Favre", email: "i.favre@cfo.ch", company: "CFO Advisory", source: "email", status: "confirmed" },
    { firstName: "Thomas", lastName: "Weber", email: "t.weber@web.ch", company: "Digital Swiss", source: "ads", status: "attended" },
    { firstName: "Claire", lastName: "Martin", email: "c.martin@hr.ch", company: "HR Conseil", source: "social", status: "confirmed" },
    { firstName: "Antoine", lastName: "Leclerc", email: "a.leclerc@tax.ch", company: "TaxPro SA", source: "email", status: "cancelled" },
  ];
  regs.forEach((r, i) => {
    db.insert(registrations).values({
      eventId: e1.id, firstName: r.firstName, lastName: r.lastName,
      email: r.email, company: r.company, ticketType: "standard",
      status: r.status as any, source: r.source,
      registeredAt: new Date(Date.now() - i * 86400000).toISOString(),
      checkedInAt: r.status === "attended" ? new Date().toISOString() : undefined,
    }).run();
  });

  [
    { channel: "email", clicks: 420, registrations: 89, conversionRate: 21.2, spend: 0 },
    { channel: "linkedin", clicks: 310, registrations: 42, conversionRate: 13.5, spend: 180 },
    { channel: "website", clicks: 890, registrations: 67, conversionRate: 7.5, spend: 0 },
    { channel: "partner", clicks: 120, registrations: 38, conversionRate: 31.7, spend: 0 },
    { channel: "ads", clicks: 650, registrations: 55, conversionRate: 8.5, spend: 340 },
    { channel: "qr", clicks: 95, registrations: 24, conversionRate: 25.3, spend: 0 },
  ].forEach(c => db.insert(acquisitionChannels).values({ eventId: e1.id, ...c }).run());

  [
    { title: "Créer la page d'inscription", status: "done", priority: "high", storyPoints: 3, sprint: 1, eventId: e1.id, createdAt: new Date().toISOString(), assignee: "Sophie" },
    { title: "Intégrer Eventbrite API", status: "done", priority: "high", storyPoints: 5, sprint: 1, eventId: e1.id, createdAt: new Date().toISOString(), assignee: "Thomas" },
    { title: "Campagne email invitation", status: "in_progress", priority: "high", storyPoints: 2, sprint: 2, eventId: e1.id, createdAt: new Date().toISOString(), assignee: "Laetitia" },
    { title: "Badge QR code participants", status: "in_progress", priority: "medium", storyPoints: 3, sprint: 2, eventId: e1.id, createdAt: new Date().toISOString(), assignee: "Marc" },
    { title: "Relance inscrits non confirmés", status: "todo", priority: "medium", storyPoints: 1, sprint: 2, eventId: e1.id, createdAt: new Date().toISOString(), assignee: "" },
    { title: "Plan de table & signalétique", status: "todo", priority: "low", storyPoints: 2, sprint: 3, eventId: null, createdAt: new Date().toISOString(), assignee: "" },
    { title: "Sondage post-événement", status: "backlog", priority: "low", storyPoints: 2, sprint: 3, eventId: null, createdAt: new Date().toISOString(), assignee: "" },
    { title: "Rapport acquisition canaux", status: "backlog", priority: "medium", storyPoints: 3, sprint: 3, eventId: null, createdAt: new Date().toISOString(), assignee: "" },
  ].forEach((t: any) => db.insert(sprintTasks).values(t).run());

  // Seed demo suppliers
  const demoSuppliers = [
    { eventId: e1.id, name: "SwissTech Convention Center", category: "venue", contactName: "Marie Rochat", email: "events@stcc.ch", phone: "+41 21 693 10 00", website: "https://stcc.ch", status: "confirmé", budget: 4500, currency: "CHF", notes: "Salle principale + 3 salles ateliers. Caution versée.", createdAt: new Date().toISOString() },
    { eventId: e1.id, name: "Jazz Trio Romand", category: "music", contactName: "Luc Thiébaud", email: "contact@jazztrio.ch", phone: "+41 79 234 56 78", website: "", status: "confirmé", budget: 800, currency: "CHF", notes: "Set 1h30 à l'apéritif. Contrat signé.", createdAt: new Date().toISOString() },
    { eventId: e1.id, name: "Traiteur Vaud Gourmand", category: "food", contactName: "Patricia Morel", email: "p.morel@vaudgourmand.ch", phone: "+41 21 800 22 33", website: "https://vaudgourmand.ch", status: "confirmé", budget: 3200, currency: "CHF", notes: "Lunch buffet pour 350 pers. Menu végétarien inclus.", createdAt: new Date().toISOString() },
    { eventId: e1.id, name: "Cave du Lac Léman", category: "drinks", contactName: "André Fontaine", email: "a.fontaine@cavelac.ch", phone: "+41 21 960 45 67", website: "", status: "contacté", budget: 1200, currency: "CHF", notes: "Vins locaux + eau minérale. Devis en attente.", createdAt: new Date().toISOString() },
    { eventId: e1.id, name: "InnoLab Workshop", category: "activity", contactName: "Sandra Goy", email: "sandra@innolab.ch", phone: "+41 78 901 23 45", website: "https://innolab.ch", status: "contacté", budget: 600, currency: "CHF", notes: "Atelier créativité 45 min en fin de conf.", createdAt: new Date().toISOString() },
    { eventId: e2.id, name: "Espace Coworking Flon", category: "venue", contactName: "Kevin Blanc", email: "kevin@flon.ch", phone: "+41 21 555 10 20", website: "", status: "confirmé", budget: 350, currency: "CHF", notes: "Salle de 40 pers avec projecteur.", createdAt: new Date().toISOString() },
  ];
  demoSuppliers.forEach((s: any) => db.insert(suppliers).values(s).run());
}

// Seed default admin user
const existingUsers = db.select().from(users).all();
if (existingUsers.length === 0) {
  const hash = bcrypt.hashSync("eventflow2026", 10);
  db.insert(users).values({
    email: "admin@eventflow.ch",
    password: hash,
    name: "Administrateur",
    role: "admin",
    createdAt: new Date().toISOString(),
  }).run();
}

export interface IStorage {
  getEvents(): Event[];
  getEvent(id: number): Event | undefined;
  createEvent(e: InsertEvent): Event;
  updateEvent(id: number, e: Partial<InsertEvent>): Event | undefined;
  deleteEvent(id: number): void;
  getRegistrations(eventId: number): Registration[];
  createRegistration(r: InsertRegistration): Registration;
  updateRegistration(id: number, r: Partial<InsertRegistration>): Registration | undefined;
  deleteRegistration(id: number): void;
  getChannels(eventId: number): AcquisitionChannel[];
  upsertChannel(c: InsertChannel): AcquisitionChannel;
  getTasks(): SprintTask[];
  createTask(t: InsertTask): SprintTask;
  updateTask(id: number, t: Partial<InsertTask>): SprintTask | undefined;
  deleteTask(id: number): void;
  getUserByEmail(email: string): User | undefined;
  createUser(u: InsertUser): User;
  getUsers(): User[];
  deleteUser(id: number): void;
  getSuppliers(eventId: number): Supplier[];
  createSupplier(s: InsertSupplier): Supplier;
  updateSupplier(id: number, s: Partial<InsertSupplier>): Supplier | undefined;
  deleteSupplier(id: number): void;
}

export class SQLiteStorage implements IStorage {
  getEvents() { return db.select().from(events).orderBy(desc(events.startDate)).all(); }
  getEvent(id: number) { return db.select().from(events).where(eq(events.id, id)).get(); }
  createEvent(e: InsertEvent) { return db.insert(events).values(e).returning().get(); }
  updateEvent(id: number, e: Partial<InsertEvent>) { return db.update(events).set(e).where(eq(events.id, id)).returning().get(); }
  deleteEvent(id: number) { db.delete(events).where(eq(events.id, id)).run(); }

  getRegistrations(eventId: number) {
    return db.select().from(registrations).where(eq(registrations.eventId, eventId)).orderBy(desc(registrations.registeredAt)).all();
  }
  createRegistration(r: InsertRegistration) { return db.insert(registrations).values(r).returning().get(); }
  updateRegistration(id: number, r: Partial<InsertRegistration>) { return db.update(registrations).set(r).where(eq(registrations.id, id)).returning().get(); }
  deleteRegistration(id: number) { db.delete(registrations).where(eq(registrations.id, id)).run(); }

  getChannels(eventId: number) { return db.select().from(acquisitionChannels).where(eq(acquisitionChannels.eventId, eventId)).all(); }
  upsertChannel(c: InsertChannel) { return db.insert(acquisitionChannels).values(c).returning().get(); }

  getTasks() { return db.select().from(sprintTasks).orderBy(sprintTasks.sprint, sprintTasks.id).all(); }
  createTask(t: InsertTask) { return db.insert(sprintTasks).values(t).returning().get(); }
  updateTask(id: number, t: Partial<InsertTask>) { return db.update(sprintTasks).set(t).where(eq(sprintTasks.id, id)).returning().get(); }
  deleteTask(id: number) { db.delete(sprintTasks).where(eq(sprintTasks.id, id)).run(); }

  getUserByEmail(email: string) { return db.select().from(users).where(eq(users.email, email)).get(); }
  createUser(u: InsertUser) { return db.insert(users).values(u).returning().get(); }
  getUsers() { return db.select().from(users).all(); }
  deleteUser(id: number) { db.delete(users).where(eq(users.id, id)).run(); }

  getSuppliers(eventId: number) { return db.select().from(suppliers).where(eq(suppliers.eventId, eventId)).orderBy(suppliers.category, suppliers.id).all(); }
  createSupplier(s: InsertSupplier) { return db.insert(suppliers).values(s).returning().get(); }
  updateSupplier(id: number, s: Partial<InsertSupplier>) { return db.update(suppliers).set(s).where(eq(suppliers.id, id)).returning().get(); }
  deleteSupplier(id: number) { db.delete(suppliers).where(eq(suppliers.id, id)).run(); }
}

export const storage = new SQLiteStorage();
