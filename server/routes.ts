import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertEventSchema, insertRegistrationSchema, insertTaskSchema, insertUserSchema, insertSupplierSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const JWT_SECRET = process.env.JWT_SECRET || "eventflow-secret-2026";
const EMAIL_FROM = process.env.EMAIL_FROM || "";
const EMAIL_PASS = process.env.EMAIL_PASS || "";

// Email transporter (uses Gmail SMTP if configured)
function getTransporter() {
  if (!EMAIL_FROM || !EMAIL_PASS) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: EMAIL_FROM, pass: EMAIL_PASS },
  });
}

// Auth middleware
function authMiddleware(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Non authentifié" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Token invalide" });
  }
}

export function registerRoutes(httpServer: Server, app: Express) {

  // ── Auth ────────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = storage.getUserByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });

  app.post("/api/auth/register", authMiddleware, (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    const { email, password, name, role } = req.body;
    if (storage.getUserByEmail(email)) return res.status(400).json({ error: "Email déjà utilisé" });
    const hash = bcrypt.hashSync(password, 10);
    const user = storage.createUser({ email, password: hash, name, role: role || "member", createdAt: new Date().toISOString() });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  });

  app.get("/api/auth/users", authMiddleware, (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    const list = storage.getUsers().map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role }));
    res.json(list);
  });

  app.delete("/api/auth/users/:id", authMiddleware, (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    storage.deleteUser(Number(req.params.id));
    res.json({ success: true });
  });

  // ── Events ─────────────────────────────────────────────────────────────────
  app.get("/api/events", (_req, res) => res.json(storage.getEvents()));

  app.get("/api/events/:id", (req, res) => {
    const event = storage.getEvent(Number(req.params.id));
    if (!event) return res.status(404).json({ error: "Not found" });
    res.json(event);
  });

  app.post("/api/events", (req, res) => {
    const parsed = insertEventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    res.json(storage.createEvent(parsed.data));
  });

  app.patch("/api/events/:id", (req, res) => {
    const result = storage.updateEvent(Number(req.params.id), req.body);
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json(result);
  });

  app.delete("/api/events/:id", (req, res) => {
    storage.deleteEvent(Number(req.params.id));
    res.json({ success: true });
  });

  // ── Registrations ───────────────────────────────────────────────────────────
  app.get("/api/events/:id/registrations", (req, res) => {
    res.json(storage.getRegistrations(Number(req.params.id)));
  });

  app.post("/api/events/:id/registrations", async (req, res) => {
    const eventId = Number(req.params.id);
    const parsed = insertRegistrationSchema.safeParse({
      ...req.body, eventId, registeredAt: new Date().toISOString(),
    });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const reg = storage.createRegistration(parsed.data);

    // Send confirmation email if configured
    const transporter = getTransporter();
    const event = storage.getEvent(eventId);
    if (transporter && event && reg.email) {
      try {
        await transporter.sendMail({
          from: EMAIL_FROM,
          to: reg.email,
          subject: `Confirmation d'inscription — ${event.title}`,
          html: `
            <h2>Votre inscription est confirmée</h2>
            <p>Bonjour ${reg.firstName} ${reg.lastName},</p>
            <p>Votre inscription à <strong>${event.title}</strong> est bien enregistrée.</p>
            <table style="border-collapse:collapse;width:100%;max-width:500px">
              <tr><td style="padding:8px;border:1px solid #eee"><strong>Date</strong></td><td style="padding:8px;border:1px solid #eee">${event.startDate} — ${event.startTime} à ${event.endTime}</td></tr>
              <tr><td style="padding:8px;border:1px solid #eee"><strong>Lieu</strong></td><td style="padding:8px;border:1px solid #eee">${event.location}</td></tr>
              <tr><td style="padding:8px;border:1px solid #eee"><strong>Adresse</strong></td><td style="padding:8px;border:1px solid #eee">${event.address}</td></tr>
            </table>
            <p style="margin-top:20px">À bientôt,<br>L'équipe EventFlow</p>
          `,
        });
      } catch (e) {
        console.error("Email error:", e);
      }
    }
    res.json(reg);
  });

  app.patch("/api/registrations/:id", (req, res) => {
    const result = storage.updateRegistration(Number(req.params.id), req.body);
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json(result);
  });

  app.delete("/api/registrations/:id", (req, res) => {
    storage.deleteRegistration(Number(req.params.id));
    res.json({ success: true });
  });

  // ── Export CSV/Excel ────────────────────────────────────────────────────────
  app.get("/api/events/:id/export/csv", (req, res) => {
    const regs = storage.getRegistrations(Number(req.params.id));
    const event = storage.getEvent(Number(req.params.id));
    const headers = ["Prénom", "Nom", "Email", "Téléphone", "Société", "Billet", "Statut", "Canal", "Inscrit le"];
    const rows = regs.map(r => [
      r.firstName, r.lastName, r.email, r.phone, r.company,
      r.ticketType, r.status, r.source,
      new Date(r.registeredAt).toLocaleDateString("fr-CH"),
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(";")).join("\n");
    const filename = `inscrits-${event?.title?.replace(/\s+/g, "-") || "event"}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csv); // BOM for Excel
  });


  // ── Suppliers ──────────────────────────────────────────────────────────────
  app.get('/api/events/:id/suppliers', (req, res) => {
    res.json(storage.getSuppliers(Number(req.params.id)));
  });

  app.post('/api/events/:id/suppliers', (req, res) => {
    const parsed = insertSupplierSchema.safeParse({
      ...req.body,
      eventId: Number(req.params.id),
      createdAt: new Date().toISOString(),
    });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    res.json(storage.createSupplier(parsed.data));
  });

  app.patch('/api/suppliers/:id', (req, res) => {
    const result = storage.updateSupplier(Number(req.params.id), req.body);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  });

  app.delete('/api/suppliers/:id', (req, res) => {
    storage.deleteSupplier(Number(req.params.id));
    res.json({ success: true });
  });

  // ── Acquisition Channels ────────────────────────────────────────────────────
  app.get("/api/events/:id/channels", (req, res) => {
    res.json(storage.getChannels(Number(req.params.id)));
  });

  app.post("/api/events/:id/channels", (req, res) => {
    res.json(storage.upsertChannel({ ...req.body, eventId: Number(req.params.id) }));
  });

  // ── Sprint Tasks ────────────────────────────────────────────────────────────
  app.get("/api/tasks", (_req, res) => res.json(storage.getTasks()));

  app.post("/api/tasks", (req, res) => {
    const parsed = insertTaskSchema.safeParse({ ...req.body, createdAt: new Date().toISOString() });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    res.json(storage.createTask(parsed.data));
  });

  app.patch("/api/tasks/:id", (req, res) => {
    const result = storage.updateTask(Number(req.params.id), req.body);
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json(result);
  });

  app.delete("/api/tasks/:id", (req, res) => {
    storage.deleteTask(Number(req.params.id));
    res.json({ success: true });
  });
}
