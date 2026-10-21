/**
 * Gera capturas de tela das principais páginas (login, visão geral, agenda, área, painel,
 * portaria, histórico, pagamento e notificações).
 * Pré-requisitos: servidor rodando em BASE_URL e Chrome/Edge instalado.
 * Uso: pnpm screens
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const OUT = path.join(ROOT, "screenshots");
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

function findBrowser() {
  for (const candidate of CHROME_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("Chrome/Edge não encontrado. Defina CHROME_PATH.");
}

function reseed() {
  const result = spawnSync(
    process.execPath,
    [path.join("node_modules", "tsx", "dist", "cli.mjs"), path.join("scripts", "seed.ts")],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`Falha no seed:\n${result.stdout ?? ""}${result.stderr ?? ""}`);
  }
}

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/login`, { redirect: "manual" });
      if (response.status === 200) return;
    } catch {
      // aguardando
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Servidor não respondeu em ${BASE}.`);
}

async function login(page, email, password, urlPattern) {
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await Promise.all([
    page.waitForURL(urlPattern, { timeout: 30_000 }),
    page.click("button[type=submit]"),
  ]);
  await page.waitForLoadState("load");
  await page.waitForTimeout(400);
}

async function capture(browser, name, run) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  const page = await context.newPage();
  try {
    await run(page);
    await page.waitForTimeout(600);
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`  📸 ${path.relative(ROOT, file)}`);
  } finally {
    await context.close();
  }
}

async function run() {
  await waitForServer();
  fs.mkdirSync(OUT, { recursive: true });
  reseed();
  const executablePath = findBrowser();
  console.log(`Navegador: ${executablePath}`);
  const browser = await chromium.launch({ headless: true, executablePath });

  try {
    await capture(browser, "01-login", async (page) => {
      await page.goto(`${BASE}/login`, { waitUntil: "load" });
    });

    await capture(browser, "02-visao-geral", async (page) => {
      await login(page, "ana@areacomum.app", "Ana@1234", "**/inicio");
    });

    await capture(browser, "03-agenda", async (page) => {
      await login(page, "ana@areacomum.app", "Ana@1234", "**/inicio");
      await page.goto(`${BASE}/agenda`, { waitUntil: "load" });
    });

    await capture(browser, "04-agenda-area", async (page) => {
      await login(page, "ana@areacomum.app", "Ana@1234", "**/inicio");
      await page.goto(`${BASE}/agenda/1`, { waitUntil: "load" });
    });

    await capture(browser, "05-minhas", async (page) => {
      await login(page, "ana@areacomum.app", "Ana@1234", "**/inicio");
      await page.goto(`${BASE}/minhas`, { waitUntil: "load" });
    });

    await capture(browser, "06-painel-sindico", async (page) => {
      await login(page, "sindico@areacomum.app", "Sindico@123", "**/admin");
      await page.goto(`${BASE}/admin`, { waitUntil: "load" });
    });

    await capture(browser, "07-portaria", async (page) => {
      await login(page, "portaria@areacomum.app", "Portaria@123", "**/portaria");
      await page.goto(`${BASE}/portaria`, { waitUntil: "load" });
    });

    await capture(browser, "08-historico", async (page) => {
      await login(page, "carla@areacomum.app", "Carla@1234", "**/inicio");
      await page.goto(`${BASE}/historico`, { waitUntil: "load" });
    });

    await capture(browser, "09-pagamento", async (page) => {
      await login(page, "carla@areacomum.app", "Carla@1234", "**/inicio");
      await page.goto(`${BASE}/historico`, { waitUntil: "load" });
      await page.getByRole("button", { name: "Pagar multa" }).first().click();
      await page.getByRole("heading", { name: "Quitar multa" }).waitFor();
    });

    await capture(browser, "10-notificacoes", async (page) => {
      await login(page, "ana@areacomum.app", "Ana@1234", "**/inicio");
      await page.getByRole("button", { name: /Notificações/ }).first().click();
      await page.getByText("Sua central").waitFor();
    });
  } finally {
    await browser.close();
  }

  console.log("\nCapturas salvas em screenshots/.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
