import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type Role = "morador" | "sindico" | "porteiro";

export interface ApartmentRow {
  id: number;
  block: string;
  number: string;
  label: string;
}

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  apartment_id: number | null;
  created_at: string;
}

export interface AreaRow {
  id: number;
  name: string;
  description: string;
  guest_limit: number;
  requires_approval: number;
  min_advance_days: number;
  open_time: string;
  close_time: string;
  active: number;
  created_at: string;
}

export type ReservationStatus = "pendente" | "confirmada" | "recusada" | "cancelada";

export interface ReservationRow {
  id: number;
  area_id: number;
  apartment_id: number;
  user_id: number;
  date: string;
  start_time: string;
  end_time: string;
  guests: number;
  status: ReservationStatus;
  notes: string;
  created_at: string;
  decided_by: number | null;
  decided_at: string | null;
  cancelled_at: string | null;
  cancelled_by: number | null;
  key_delivered_at: string | null;
  key_returned_at: string | null;
}

export interface BlockRow {
  id: number;
  area_id: number;
  date: string;
  reason: string;
  created_by: number | null;
  created_at: string;
}

export interface FineRow {
  id: number;
  apartment_id: number;
  reservation_id: number;
  amount_cents: number;
  status: "aberta" | "paga";
  reason: string;
  created_at: string;
  paid_at: string | null;
  paid_by: number | null;
}

export interface PaymentRow {
  id: number;
  fine_id: number;
  apartment_id: number;
  paid_by: number | null;
  amount_cents: number;
  method: "pix" | "cartao" | "manual";
  receipt_code: string;
  created_at: string;
}

export interface NotificationRow {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const globalForDb = globalThis as unknown as { __areaComumDb?: Database.Database };

function databaseFile(): string {
  const configured = process.env.DB_PATH;
  const file = configured
    ? path.resolve(process.cwd(), configured)
    : path.join(process.cwd(), "data", "area-comum.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return file;
}

function openDatabase(): Database.Database {
  const db = new Database(databaseFile());
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS apartments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block TEXT NOT NULL,
      number TEXT NOT NULL,
      label TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('morador','sindico','porteiro')),
      apartment_id INTEGER REFERENCES apartments(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      description TEXT NOT NULL DEFAULT '',
      guest_limit INTEGER NOT NULL CHECK (guest_limit > 0),
      requires_approval INTEGER NOT NULL DEFAULT 0 CHECK (requires_approval IN (0,1)),
      min_advance_days INTEGER NOT NULL DEFAULT 0 CHECK (min_advance_days >= 0),
      open_time TEXT NOT NULL DEFAULT '08:00',
      close_time TEXT NOT NULL DEFAULT '22:00',
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS maintenance_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      UNIQUE (area_id, date)
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
      apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE RESTRICT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      guests INTEGER NOT NULL CHECK (guests > 0),
      status TEXT NOT NULL CHECK (status IN ('pendente','confirmada','recusada','cancelada')),
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      decided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      decided_at TEXT,
      cancelled_at TEXT,
      cancelled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      key_delivered_at TEXT,
      key_returned_at TEXT
    );

    CREATE TABLE IF NOT EXISTS fines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
      reservation_id INTEGER NOT NULL UNIQUE REFERENCES reservations(id) ON DELETE CASCADE,
      amount_cents INTEGER NOT NULL DEFAULT 5000,
      status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','paga')),
      reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      paid_at TEXT,
      paid_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fine_id INTEGER NOT NULL UNIQUE REFERENCES fines(id) ON DELETE CASCADE,
      apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
      paid_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      amount_cents INTEGER NOT NULL,
      method TEXT NOT NULL CHECK (method IN ('pix','cartao','manual')),
      receipt_code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reservations_area_date ON reservations (area_id, date);
    CREATE INDEX IF NOT EXISTS idx_reservations_apartment ON reservations (apartment_id);
    CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations (status);
    CREATE INDEX IF NOT EXISTS idx_blocks_area_date ON maintenance_blocks (area_id, date);
    CREATE INDEX IF NOT EXISTS idx_fines_apartment_status ON fines (apartment_id, status);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token_hash);
    CREATE INDEX IF NOT EXISTS idx_payments_apartment ON payments (apartment_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, read_at);
  `);
}

export function getDb(): Database.Database {
  if (!globalForDb.__areaComumDb) {
    globalForDb.__areaComumDb = openDatabase();
  }
  return globalForDb.__areaComumDb;
}

/** Usado apenas pelo script de seed. */
export function resetDatabase(db: Database.Database = getDb()) {
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM payments;
    DELETE FROM fines;
    DELETE FROM reservations;
    DELETE FROM maintenance_blocks;
    DELETE FROM sessions;
    DELETE FROM users;
    DELETE FROM areas;
    DELETE FROM apartments;
    DELETE FROM sqlite_sequence;
  `);
}
