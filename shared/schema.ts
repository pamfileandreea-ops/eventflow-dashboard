import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Events ───────────────────────────────────────────────────────────────────
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  location: text("location").notNull(),
  address: text("address").notNull().default(""),
  startDate: text("start_date").notNull(),   // ISO string
  endDate: text("end_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  category: text("category").notNull().default("conference"),
  capacity: integer("capacity").notNull().default(100),
  coverImage: text("cover_image").notNull().default(""),
  status: text("status").notNull().default("draft"), // draft | published | completed | cancelled
  platform: text("platform").notNull().default("eventbrite"), // eventbrite | cvent | bizzabo | manual
  externalId: text("external_id"),
  externalUrl: text("external_url"),
  ticketPrice: real("ticket_price").notNull().default(0),
  currency: text("currency").notNull().default("CHF"),
});

export const insertEventSchema = createInsertSchema(events).omit({ id: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// ── Registrations ────────────────────────────────────────────────────────────
export const registrations = sqliteTable("registrations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: integer("event_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  company: text("company").notNull().default(""),
  ticketType: text("ticket_type").notNull().default("standard"),
  status: text("status").notNull().default("confirmed"), // confirmed | pending | cancelled | attended
  source: text("source").notNull().default("direct"),    // direct | email | social | partner | api
  registeredAt: text("registered_at").notNull(),
  checkedInAt: text("checked_in_at"),
  notes: text("notes").notNull().default(""),
});

export const insertRegistrationSchema = createInsertSchema(registrations).omit({ id: true });
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrations.$inferSelect;

// ── Acquisition Channels ──────────────────────────────────────────────────────
export const acquisitionChannels = sqliteTable("acquisition_channels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: integer("event_id").notNull(),
  channel: text("channel").notNull(), // email | linkedin | website | partner | ads | qr
  clicks: integer("clicks").notNull().default(0),
  registrations: integer("registrations").notNull().default(0),
  conversionRate: real("conversion_rate").notNull().default(0),
  spend: real("spend").notNull().default(0),
});

export const insertChannelSchema = createInsertSchema(acquisitionChannels).omit({ id: true });
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type AcquisitionChannel = typeof acquisitionChannels.$inferSelect;

// ── Users ───────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("member"), // admin | member
  createdAt: text("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ── Suppliers / Prestataires ────────────────────────────────────────────────
export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: integer("event_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // venue | music | food | drinks | activity | other
  contactName: text("contact_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  website: text("website").notNull().default(""),
  status: text("status").notNull().default("prospect"), // prospect | contacté | confirmé | annulé
  budget: real("budget").notNull().default(0),
  currency: text("currency").notNull().default("CHF"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

// ── Sprint / Kanban Tasks ─────────────────────────────────────────────────────
export const sprintTasks = sqliteTable("sprint_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: integer("event_id"),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("backlog"), // backlog | todo | in_progress | done
  priority: text("priority").notNull().default("medium"), // low | medium | high | critical
  assignee: text("assignee").notNull().default(""),
  storyPoints: integer("story_points").notNull().default(1),
  sprint: integer("sprint").notNull().default(1),
  createdAt: text("created_at").notNull(),
  dueDate: text("due_date"),
});

export const insertTaskSchema = createInsertSchema(sprintTasks).omit({ id: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type SprintTask = typeof sprintTasks.$inferSelect;
