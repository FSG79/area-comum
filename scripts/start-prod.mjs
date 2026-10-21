/**
 * Inicialização para hospedagem (Render, Railway, VPS etc.).
 * - Cria os dados de exemplo se o banco ainda não existir/estiver vazio.
 * - Sobe o Next.js em produção na porta definida por PORT.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawn, spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const DB_PATH = process.env.DB_PATH
  ? path.resolve(ROOT, process.env.DB_PATH)
  : path.join(ROOT, "data", "area-comum.db");

function databaseIsEmpty() {
  if (!existsSync(DB_PATH)) return true;
  try {
    const Database = require("better-sqlite3");
    const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
    const row = db.prepare("SELECT COUNT(*) AS total FROM users").get();
    db.close();
    return !row || row.total === 0;
  } catch {
    return true;
  }
}

if (databaseIsEmpty()) {
  console.log("[area-comum] Banco não encontrado ou vazio. Criando dados de exemplo...");
  const seed = spawnSync(
    process.execPath,
    [path.join("node_modules", "tsx", "dist", "cli.mjs"), path.join("scripts", "seed.ts")],
    { stdio: "inherit", env: process.env },
  );
  if (seed.status !== 0) {
    console.error("[area-comum] Falha ao criar os dados de exemplo.");
    process.exit(seed.status ?? 1);
  }
}

const port = process.env.PORT || "3000";
console.log(`[area-comum] Iniciando Next.js na porta ${port}...`);
const child = spawn(
  process.execPath,
  [path.join("node_modules", "next", "dist", "bin", "next"), "start", "-p", String(port)],
  { stdio: "inherit", env: process.env },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code) => process.exit(code ?? 1));
