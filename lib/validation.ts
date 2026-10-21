import { AppError, badRequest } from "@/lib/errors";

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    throw badRequest("Corpo da requisição inválido (JSON esperado).");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw badRequest("Corpo da requisição inválido.");
  }
  return parsed as Record<string, unknown>;
}

export function requiredString(
  body: Record<string, unknown>,
  field: string,
  label: string,
  options: { min?: number; max?: number } = {},
): string {
  const value = body[field];
  if (typeof value !== "string") throw badRequest(`${label} é obrigatório.`);
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length < (options.min ?? 1)) {
    throw badRequest(`${label} deve ter pelo menos ${options.min ?? 1} caractere(s).`);
  }
  if (trimmed.length > (options.max ?? 300)) {
    throw badRequest(`${label} deve ter no máximo ${options.max ?? 300} caracteres.`);
  }
  return trimmed;
}

export function optionalString(
  body: Record<string, unknown>,
  field: string,
  label: string,
  max = 300,
): string {
  const value = body[field];
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") throw badRequest(`${label} inválido.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw badRequest(`${label} deve ter no máximo ${max} caracteres.`);
  return trimmed;
}

export function requiredInt(
  body: Record<string, unknown>,
  field: string,
  label: string,
  options: { min?: number; max?: number } = {},
): number {
  const raw = body[field];
  const value = typeof raw === "string" ? Number(raw) : raw;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw badRequest(`${label} deve ser um número inteiro.`);
  }
  if (value < (options.min ?? 1)) {
    throw badRequest(`${label} deve ser maior ou igual a ${options.min ?? 1}.`);
  }
  if (value > (options.max ?? 1000)) {
    throw badRequest(`${label} deve ser menor ou igual a ${options.max ?? 1000}.`);
  }
  return value;
}

export function booleanFlag(body: Record<string, unknown>, field: string, fallback = false): boolean {
  const value = body[field];
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw badRequest(`Campo ${field} inválido.`);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function assertEmail(email: string): string {
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized) || normalized.length > 120) {
    throw badRequest("Informe um e-mail válido.");
  }
  return normalized;
}

export function assertPassword(password: unknown): string {
  if (typeof password !== "string" || password.length < 8) {
    throw badRequest("A senha deve ter pelo menos 8 caracteres.");
  }
  if (password.length > 128) throw badRequest("A senha deve ter no máximo 128 caracteres.");
  return password;
}

export function rethrowAppError(error: unknown): never {
  if (error instanceof AppError) throw error;
  throw error;
}
