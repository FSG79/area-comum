import { getDb, type Role, type UserRow } from "@/lib/db";
import { badRequest, conflict } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/password";
import { assertEmail, assertPassword } from "@/lib/validation";

export interface Account {
  id: number;
  name: string;
  email: string;
  role: Role;
  apartmentId: number | null;
  apartmentLabel: string | null;
}

interface UserWithApartment extends UserRow {
  apartment_label: string | null;
}

function mapAccount(row: UserWithApartment): Account {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    apartmentId: row.apartment_id,
    apartmentLabel: row.apartment_label,
  };
}

export function findUserByEmail(email: string): UserWithApartment | null {
  const row = getDb()
    .prepare(
      `SELECT u.*, a.label AS apartment_label
         FROM users u
         LEFT JOIN apartments a ON a.id = u.apartment_id
        WHERE u.email = ? COLLATE NOCASE`,
    )
    .get(email.trim().toLowerCase()) as UserWithApartment | undefined;
  return row ?? null;
}

/** Retorna a conta ou null quando e-mail/senha não conferem. */
export function authenticate(email: string, password: string): Account | null {
  const row = findUserByEmail(email);
  if (!row) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return mapAccount(row);
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  block: string;
  number: string;
}

export function registerMorador(input: RegisterInput): Account {
  const name = input.name.trim();
  if (name.length < 3 || name.length > 80) {
    throw badRequest("O nome deve ter entre 3 e 80 caracteres.");
  }
  const email = assertEmail(input.email);
  assertPassword(input.password);

  const block = input.block.trim().toUpperCase();
  const number = input.number.trim().toUpperCase();
  if (!/^[A-Z0-9]{1,5}$/.test(block)) {
    throw badRequest("Informe um bloco válido (ex.: A).");
  }
  if (!/^[A-Z0-9-]{1,8}$/.test(number)) {
    throw badRequest("Informe um número de apartamento válido (ex.: 101).");
  }
  const label = `${block}-${number}`;

  const db = getDb();
  if (findUserByEmail(email)) {
    throw conflict("Já existe uma conta com este e-mail. Faça login.");
  }

  return db.transaction(() => {
    let apartment = db
      .prepare("SELECT id, label FROM apartments WHERE label = ?")
      .get(label) as { id: number; label: string } | undefined;

    if (apartment) {
      const occupant = db
        .prepare("SELECT id FROM users WHERE apartment_id = ? LIMIT 1")
        .get(apartment.id) as { id: number } | undefined;
      if (occupant) {
        throw conflict(
          "Este apartamento já possui um morador cadastrado. Fale com o síndico para liberar outro acesso.",
        );
      }
    } else {
      const created = db
        .prepare("INSERT INTO apartments (block, number, label, created_at) VALUES (?, ?, ?, ?)")
        .run(block, number, label, new Date().toISOString());
      apartment = { id: Number(created.lastInsertRowid), label };
    }

    const passwordHash = hashPassword(input.password);
    const result = db
      .prepare(
        `INSERT INTO users (name, email, password_hash, role, apartment_id, created_at)
         VALUES (?, ?, ?, 'morador', ?, ?)`,
      )
      .run(name, email, passwordHash, apartment.id, new Date().toISOString());

    return {
      id: Number(result.lastInsertRowid),
      name,
      email,
      role: "morador" as Role,
      apartmentId: apartment.id,
      apartmentLabel: label,
    };
  })();
}
