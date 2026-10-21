/**
 * Testes de regras de negócio e permissões do Área Comum.
 *
 * Pré-requisito: servidor rodando em BASE_URL (padrão http://127.0.0.1:3000).
 * Uso: pnpm test:rules
 *
 * O script recria os dados de exemplo entre os grupos de teste e, ao final,
 * deixa o banco no estado original.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const DB_PATH = process.env.DB_PATH
  ? path.resolve(ROOT, process.env.DB_PATH)
  : path.join(ROOT, "data", "area-comum.db");

const results = [];
let passed = 0;
let failed = 0;
let skipped = 0;

function record(name, ok, detail = "", skip = false) {
  if (skip) {
    skipped += 1;
    results.push({ name, status: "SKIP", detail });
    console.log(`  ⏭  ${name}${detail ? ` — ${detail}` : ""}`);
    return;
  }
  if (ok) {
    passed += 1;
    results.push({ name, status: "OK", detail });
    console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed += 1;
    results.push({ name, status: "FALHOU", detail });
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

function localDate(offset = 0) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = formatter.format(new Date()).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10);
}

function localHour() {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hour12: false,
  });
  return Number(formatter.format(new Date()));
}

function dbRows(sql, ...params) {
  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  try {
    return db.prepare(sql).all(...params);
  } finally {
    db.close();
  }
}

function first(sql, ...params) {
  return dbRows(sql, ...params)[0];
}

function reseed() {
  const result = spawnSync(
    process.execPath,
    [path.join("node_modules", "tsx", "dist", "cli.mjs"), path.join("scripts", "seed.ts")],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`Falha ao recriar os dados de exemplo:\n${result.stdout}\n${result.stderr}`);
  }
}

class Client {
  constructor(label) {
    this.label = label;
    this.cookie = null;
  }

  async request(pathname, options = {}) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.requestOnce(pathname, options);
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      }
    }
    throw lastError;
  }

  async requestOnce(pathname, { method = "GET", body } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (this.cookie) headers.Cookie = this.cookie;
    const response = await fetch(`${BASE}${pathname}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      redirect: "manual",
    });
    const setCookies =
      typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
    for (const cookie of setCookies) {
      const pair = cookie.split(";")[0];
      if (pair.startsWith("area_comum_session=")) this.cookie = pair;
    }
    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    return { status: response.status, data, headers: response.headers, response };
  }

  async login(email, password) {
    const result = await this.request("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (result.status !== 200) {
      throw new Error(`Login de ${email} falhou (HTTP ${result.status}): ${JSON.stringify(result.data)}`);
    }
    return result;
  }

  async logout() {
    return this.request("/api/auth/logout", { method: "POST" });
  }
}

function isRedirect(status) {
  return status === 302 || status === 307 || status === 308;
}

async function waitForServer() {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/login`, { redirect: "manual" });
      if (response.status === 200) return;
    } catch {
      // servidor ainda subindo
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Servidor não respondeu em ${BASE} a tempo.`);
}

const html = (value) => (typeof value === "string" ? value : "");

async function run() {
  await waitForServer();
  console.log(`Servidor: ${BASE}`);
  console.log(`Banco: ${DB_PATH}`);

  // =====================================================================
  section("1. Autenticação, hash de senha e permissões por papel");
  reseed();
  const sindico = new Client("síndico");
  const porteiro = new Client("porteiro");
  const ana = new Client("Ana A-101");
  const bruno = new Client("Bruno A-202");
  const carla = new Client("Carla A-303");
  const diego = new Client("Diego A-404");
  const anon = new Client("anônimo");

  await sindico.login("sindico@areacomum.app", "Sindico@123");
  await porteiro.login("portaria@areacomum.app", "Portaria@123");
  await ana.login("ana@areacomum.app", "Ana@1234");
  await bruno.login("bruno@areacomum.app", "Bruno@1234");
  await carla.login("carla@areacomum.app", "Carla@1234");
  await diego.login("diego@areacomum.app", "Diego@1234");
  record("login com as 6 contas de exemplo", true, "síndico, portaria e 4 moradores");

  const loginMorador = await new Client("login morador").request("/api/auth/login", {
    method: "POST",
    body: { email: "ana@areacomum.app", password: "Ana@1234" },
  });
  record(
    "login do morador redireciona para a visão geral (/inicio)",
    loginMorador.status === 200 && loginMorador.data?.redirect === "/inicio",
    `redirect: ${loginMorador.data?.redirect}`,
  );

  const wrong = await new Client("errado").request("/api/auth/login", {
    method: "POST",
    body: { email: "ana@areacomum.app", password: "senha-errada" },
  });
  record("login recusa senha incorreta (401)", wrong.status === 401, `HTTP ${wrong.status}`);

  const unknown = await new Client("errado").request("/api/auth/login", {
    method: "POST",
    body: { email: "ninguem@areacomum.app", password: "qualquer123" },
  });
  record("login recusa e-mail inexistente (401)", unknown.status === 401, `HTTP ${unknown.status}`);

  const userRows = dbRows("SELECT email, password_hash FROM users");
  const hashesOk = userRows.every(
    (row) => row.password_hash.startsWith("scrypt$") && row.password_hash.length > 40,
  );
  const plaintextStored = userRows.some((row) =>
    ["Sindico@123", "Portaria@123", "Ana@1234", "Bruno@1234", "Carla@1234", "Diego@1234"].includes(
      row.password_hash,
    ),
  );
  record(
    "senhas guardadas com hash scrypt + salt (sem texto puro)",
    hashesOk && !plaintextStored,
    `${userRows.length} usuários verificados`,
  );

  const anonCreate = await anon.request("/api/reservations", {
    method: "POST",
    body: { areaId: 1, date: localDate(1), startTime: "10:00", endTime: "11:00", guests: 2 },
  });
  record("reserva sem login é bloqueada (401)", anonCreate.status === 401, `HTTP ${anonCreate.status}`);

  const anonList = await anon.request(`/api/reservations?date=${localDate(0)}`);
  record("consulta de agenda sem login é bloqueada (401)", anonList.status === 401, `HTTP ${anonList.status}`);

  const areaByName = (name) => first("SELECT id FROM areas WHERE name = ?", name);
  const pendingSalon = first(
    "SELECT r.id FROM reservations r JOIN areas ar ON ar.id = r.area_id WHERE r.status = 'pendente' AND ar.name = 'Salão de festas' LIMIT 1",
  );

  const moradorCreateArea = await ana.request("/api/areas", {
    method: "POST",
    body: { name: "Área proibida", guestLimit: 10, minAdvanceDays: 0, openTime: "08:00", closeTime: "22:00" },
  });
  record("morador não cadastra área (403)", moradorCreateArea.status === 403, `HTTP ${moradorCreateArea.status}`);

  const moradorApprove = await ana.request(`/api/reservations/${pendingSalon.id}/decision`, {
    method: "POST",
    body: { decision: "aprovar" },
  });
  record("morador não aprova reserva (403)", moradorApprove.status === 403, `HTTP ${moradorApprove.status}`);

  const moradorKeys = await ana.request(`/api/reservations/${pendingSalon.id}/keys`, {
    method: "POST",
    body: { action: "entrega" },
  });
  record("morador não registra chave (403)", moradorKeys.status === 403, `HTTP ${moradorKeys.status}`);

  const porteiroTomorrow = await porteiro.request(`/api/reservations?date=${localDate(1)}`);
  record(
    "portaria não consulta reservas de outro dia (403)",
    porteiroTomorrow.status === 403,
    `HTTP ${porteiroTomorrow.status}`,
  );

  const porteiroToday = await porteiro.request(`/api/reservations?date=${localDate(0)}`);
  const todayOnly =
    Array.isArray(porteiroToday.data?.reservations) &&
    porteiroToday.data.reservations.length > 0 &&
    porteiroToday.data.reservations.every((item) => item.date === localDate(0));
  record(
    "portaria consulta apenas as reservas de hoje",
    porteiroToday.status === 200 && todayOnly,
    `${porteiroToday.data?.reservations?.length ?? 0} reserva(s) hoje`,
  );

  const moradorTomorrow = await ana.request(`/api/reservations?date=${localDate(1)}`);
  record(
    "morador consulta a agenda de outros dias (200)",
    moradorTomorrow.status === 200,
    `HTTP ${moradorTomorrow.status}`,
  );

  const anaNotifications = await ana.request("/api/notifications");
  record(
    "central de notificações entrega os avisos do morador",
    anaNotifications.status === 200 && (anaNotifications.data?.unread ?? 0) > 0,
    `${anaNotifications.data?.unread ?? 0} não lida(s)`,
  );
  const markRead = await ana.request("/api/notifications/read", { method: "POST" });
  const anaNotificationsAfter = await ana.request("/api/notifications");
  record(
    "notificações podem ser marcadas como lidas",
    markRead.status === 200 && anaNotificationsAfter.data?.unread === 0,
    `não lidas após marcar: ${anaNotificationsAfter.data?.unread}`,
  );
  const carlaNotifications = await carla.request("/api/notifications");
  record(
    "notificações são individuais por usuário",
    (carlaNotifications.data?.unread ?? 0) > 0,
    `${carlaNotifications.data?.unread ?? 0} não lida(s) da Carla`,
  );

  const anonAgenda = await anon.request("/agenda");
  record(
    "página /agenda exige login (redireciona para /login)",
    isRedirect(anonAgenda.status) && String(anonAgenda.headers.get("location")).includes("/login"),
    `HTTP ${anonAgenda.status} → ${anonAgenda.headers.get("location")}`,
  );

  const anaAdminPage = await ana.request("/admin");
  record(
    "morador não abre o painel do síndico (redireciona para /inicio)",
    isRedirect(anaAdminPage.status) && String(anaAdminPage.headers.get("location")).includes("/inicio"),
    `HTTP ${anaAdminPage.status} → ${anaAdminPage.headers.get("location")}`,
  );

  const porteiroAgendaPage = await porteiro.request("/agenda");
  record(
    "portaria não abre a agenda geral (redireciona para /portaria)",
    isRedirect(porteiroAgendaPage.status) &&
      String(porteiroAgendaPage.headers.get("location")).includes("/portaria"),
    `HTTP ${porteiroAgendaPage.status} → ${porteiroAgendaPage.headers.get("location")}`,
  );

  const sindicoPortariaPage = await sindico.request("/portaria");
  record(
    "síndico não abre a tela da portaria (redireciona)",
    isRedirect(sindicoPortariaPage.status) &&
      String(sindicoPortariaPage.headers.get("location")).includes("/admin"),
    `HTTP ${sindicoPortariaPage.status} → ${sindicoPortariaPage.headers.get("location")}`,
  );

  const portariaHtml = html((await porteiro.request("/portaria")).data);
  record(
    "tela da portaria mostra só as reservas do dia",
    portariaHtml.includes("A-202") &&
      portariaHtml.includes("A-404") &&
      !portariaHtml.includes("Salão de festas") &&
      !portariaHtml.includes("A-101"),
    "contém A-202 e A-404 do dia; não contém Salão (futuro) nem A-101",
  );

  const adminHtml = html((await sindico.request("/admin")).data);
  record(
    "painel do síndico mostra aprovações e uso do mês",
    adminHtml.includes("Aprovações pendentes") &&
      adminHtml.includes("Uso das áreas no mês") &&
      adminHtml.includes("Festa de aniversário de 50 anos"),
    "pendência de exemplo visível",
  );

  const agendaHtml = html((await ana.request("/agenda")).data);
  record(
    "agenda do morador lista as quatro áreas e as regras",
    ["Salão de festas", "Churrasqueira", "Quadra", "Sala de reuniões"].every((name) =>
      agendaHtml.includes(name),
    ) && agendaHtml.includes("Regras do condomínio"),
  );

  const historicoHtml = html((await ana.request("/historico")).data);
  record(
    "histórico do morador é só do próprio apartamento",
    historicoHtml.includes("A-101") &&
      !historicoHtml.includes("A-202") &&
      !historicoHtml.includes("A-303"),
    "apenas A-101",
  );

  const novo = new Client("novo morador");
  const register = await novo.request("/api/auth/register", {
    method: "POST",
    body: {
      name: "Novo Morador Teste",
      email: "TESTE.NOVO@areacomum.app",
      password: "Teste@1234",
      block: "B",
      number: "201",
    },
  });
  record(
    "cadastro de morador cria conta e sessão (201)",
    register.status === 201 && register.data?.user?.role === "morador",
    `HTTP ${register.status} · ${register.data?.user?.email ?? ""}`,
  );
  const novoAgenda = await novo.request("/agenda");
  record(
    "morador recém-cadastrado já acessa a agenda",
    novoAgenda.status === 200 && html(novoAgenda.data).includes("Agenda"),
    `HTTP ${novoAgenda.status}`,
  );

  const duplicateEmail = await new Client("duplicado").request("/api/auth/register", {
    method: "POST",
    body: {
      name: "Outra Pessoa",
      email: "teste.novo@areacomum.app",
      password: "Teste@1234",
      block: "B",
      number: "202",
    },
  });
  record("cadastro recusa e-mail duplicado (409)", duplicateEmail.status === 409, `HTTP ${duplicateEmail.status}`);

  const occupiedApartment = await new Client("apto ocupado").request("/api/auth/register", {
    method: "POST",
    body: {
      name: "Invasor Teste",
      email: "invasor@areacomum.app",
      password: "Teste@1234",
      block: "A",
      number: "101",
    },
  });
  record(
    "cadastro não pode assumir apartamento já ocupado (409)",
    occupiedApartment.status === 409,
    `HTTP ${occupiedApartment.status}`,
  );

  const upperLogin = new Client("email maiúsculo");
  const upperResult = await upperLogin.request("/api/auth/login", {
    method: "POST",
    body: { email: "ANA@AREACOMUM.APP", password: "Ana@1234" },
  });
  record("login aceita e-mail com maiúsculas", upperResult.status === 200, `HTTP ${upperResult.status}`);

  await ana.logout();
  const afterLogout = await ana.request(`/api/reservations?date=${localDate(0)}`);
  record("logout invalida a sessão (401)", afterLogout.status === 401, `HTTP ${afterLogout.status}`);
  await ana.login("ana@areacomum.app", "Ana@1234");

  // =====================================================================
  section("2. Regras de criação, conflito, antecedência, limite e aprovação");
  reseed();
  const s2 = new Client("síndico");
  const a2 = new Client("Ana");
  const b2 = new Client("Bruno");
  await s2.login("sindico@areacomum.app", "Sindico@123");
  await a2.login("ana@areacomum.app", "Ana@1234");
  await b2.login("bruno@areacomum.app", "Bruno@1234");
  const salao = areaByName("Salão de festas");
  const churrasqueira = areaByName("Churrasqueira");
  const quadra = areaByName("Quadra");
  const sala = areaByName("Sala de reuniões");

  const book = (client, areaId, date, startTime, endTime, guests, notes = "") =>
    client.request("/api/reservations", {
      method: "POST",
      body: { areaId: areaId.id, date, startTime, endTime, guests, notes },
    });

  const advance = await book(a2, salao, localDate(2), "19:00", "23:00", 20);
  record(
    "salão recusa reserva com menos de 3 dias de antecedência (400)",
    advance.status === 400 && String(advance.data?.error).includes("antecedência"),
    advance.data?.error,
  );

  const guests = await book(a2, quadra, localDate(1), "18:00", "20:00", 21);
  record(
    "limite de convidados da área é respeitado (400)",
    guests.status === 400 && String(guests.data?.error).includes("máximo 20"),
    guests.data?.error,
  );

  const maxFuture = await book(a2, quadra, localDate(1), "20:00", "21:00", 5);
  record(
    "apartamento com 2 reservas futuras não faz outra (409)",
    maxFuture.status === 409 && String(maxFuture.data?.error).includes("duas reservas futuras"),
    maxFuture.data?.error,
  );

  const outside = await book(a2, quadra, localDate(1), "06:00", "08:00", 5);
  record(
    "reserva fora do horário de funcionamento é recusada (400)",
    outside.status === 400 && String(outside.data?.error).includes("funciona das"),
    outside.data?.error,
  );

  if (localHour() >= 10) {
    const past = await book(a2, quadra, localDate(0), "08:00", "09:00", 5);
    record(
      "reserva em horário já passado é recusada (400)",
      past.status === 400 && String(past.data?.error).includes("futuro"),
      past.data?.error,
    );
  } else {
    record("reserva em horário passado", false, "execução antes das 10h — verificação ignorada", true);
  }

  const anaQuadra = first(
    `SELECT r.id FROM reservations r
       JOIN areas ar ON ar.id = r.area_id
       JOIN apartments ap ON ap.id = r.apartment_id
      WHERE ar.name = 'Quadra' AND ap.label = 'A-101' AND r.date = ? AND r.status = 'confirmada'`,
    localDate(2),
  );
  const cancelOk = await a2.request(`/api/reservations/${anaQuadra.id}/cancel`, { method: "POST" });
  record(
    "cancelamento com mais de 24h não gera multa",
    cancelOk.status === 200 && cancelOk.data?.fineCreated === false,
    `HTTP ${cancelOk.status} · multa: ${cancelOk.data?.fineCreated}`,
  );

  const originalPendingSalon = first(
    "SELECT r.id FROM reservations r JOIN areas ar ON ar.id = r.area_id WHERE r.status = 'pendente' AND ar.name = 'Salão de festas' LIMIT 1",
  );
  const cancelOriginal = await a2.request(
    `/api/reservations/${originalPendingSalon.id}/cancel`,
    { method: "POST" },
  );
  record(
    "cancelamento de solicitação pendente com mais de 24h não gera multa",
    cancelOriginal.status === 200 && cancelOriginal.data?.fineCreated === false,
    `HTTP ${cancelOriginal.status} · multa: ${cancelOriginal.data?.fineCreated}`,
  );

  const anaUnreadBeforeBooking = (await a2.request("/api/notifications")).data?.unread ?? 0;
  const salonPending = await book(a2, salao, localDate(3), "19:00", "23:00", 40, "Teste de aprovação");
  record(
    "salão com 3 dias de antecedência entra como pendente de aprovação (201)",
    salonPending.status === 201 && salonPending.data?.reservation?.status === "pendente",
    `status: ${salonPending.data?.reservation?.status}`,
  );
  const anaUnreadAfterBooking = (await a2.request("/api/notifications")).data?.unread ?? 0;
  record(
    "reserva pendente gera notificação para o morador",
    anaUnreadAfterBooking === anaUnreadBeforeBooking + 1,
    `não lidas: ${anaUnreadBeforeBooking} → ${anaUnreadAfterBooking}`,
  );
  const sindicoNotif = await s2.request("/api/notifications");
  record(
    "nova solicitação gera notificação para o síndico",
    (sindicoNotif.data?.notifications ?? []).some((item) =>
      String(item.title).toLowerCase().includes("solicitação"),
    ),
    `${sindicoNotif.data?.unread ?? 0} aviso(s) do síndico`,
  );

  const quadraInstant = await book(a2, quadra, localDate(1), "18:00", "20:00", 8);
  record(
    "quadra é confirmada na hora (201)",
    quadraInstant.status === 201 && quadraInstant.data?.reservation?.status === "confirmada",
    `status: ${quadraInstant.data?.reservation?.status}`,
  );

  const conflict = await book(a2, quadra, localDate(1), "19:00", "20:00", 3);
  record(
    "não permite duas reservas no mesmo horário na mesma área (409)",
    conflict.status === 409 && String(conflict.data?.error).includes("Já existe reserva"),
    conflict.data?.error,
  );

  const maxFutureAgain = await book(a2, sala, localDate(2), "10:00", "11:00", 4);
  record(
    "limite de 2 reservas futuras também vale após novas reservas (409)",
    maxFutureAgain.status === 409 && String(maxFutureAgain.data?.error).includes("duas reservas futuras"),
    maxFutureAgain.data?.error,
  );

  const cancelOther = await b2.request(`/api/reservations/${salonPending.data.reservation.id}/cancel`, {
    method: "POST",
  });
  record(
    "morador não cancela reserva de outro apartamento (403)",
    cancelOther.status === 403,
    `HTTP ${cancelOther.status}`,
  );

  const approve = await s2.request(`/api/reservations/${salonPending.data.reservation.id}/decision`, {
    method: "POST",
    body: { decision: "aprovar" },
  });
  record(
    "síndico aprova reserva pendente (200 → confirmada)",
    approve.status === 200 && approve.data?.reservation?.status === "confirmada",
    `status: ${approve.data?.reservation?.status}`,
  );

  const approveAgain = await s2.request(`/api/reservations/${salonPending.data.reservation.id}/decision`, {
    method: "POST",
    body: { decision: "aprovar" },
  });
  record(
    "não aprova duas vezes a mesma reserva (409)",
    approveAgain.status === 409,
    `HTTP ${approveAgain.status}`,
  );

  const brunoPendingChurras = first(
    `SELECT r.id FROM reservations r
       JOIN areas ar ON ar.id = r.area_id
       JOIN apartments ap ON ap.id = r.apartment_id
      WHERE ar.name = 'Churrasqueira' AND ap.label = 'A-202' AND r.status = 'pendente'`,
  );
  await b2.request(`/api/reservations/${brunoPendingChurras.id}/cancel`, { method: "POST" });
  const brunoSalon = await book(b2, salao, localDate(4), "19:00", "22:00", 20);
  record(
    "segunda solicitação pendente é criada para testar recusa",
    brunoSalon.status === 201 && brunoSalon.data?.reservation?.status === "pendente",
    `HTTP ${brunoSalon.status}`,
  );
  const reject = await s2.request(`/api/reservations/${brunoSalon.data.reservation.id}/decision`, {
    method: "POST",
    body: { decision: "recusar" },
  });
  record(
    "síndico recusa reserva pendente (200 → recusada)",
    reject.status === 200 && reject.data?.reservation?.status === "recusada",
    `status: ${reject.data?.reservation?.status}`,
  );

  const salaInstant = await book(b2, sala, localDate(1), "09:00", "11:00", 5);
  record(
    "sala de reuniões é confirmada na hora (201)",
    salaInstant.status === 201 && salaInstant.data?.reservation?.status === "confirmada",
    `status: ${salaInstant.data?.reservation?.status}`,
  );

  const churrasAdvance = await book(b2, churrasqueira, localDate(2), "12:00", "15:00", 10);
  record(
    "churrasqueira também exige 3 dias de antecedência (400)",
    churrasAdvance.status === 400 && String(churrasAdvance.data?.error).includes("antecedência"),
    churrasAdvance.data?.error,
  );

  // =====================================================================
  section("3. Bloqueio de manutenção e multa em aberto");
  reseed();
  const s3 = new Client("síndico");
  const a3 = new Client("Ana");
  const c3 = new Client("Carla");
  await s3.login("sindico@areacomum.app", "Sindico@123");
  await a3.login("ana@areacomum.app", "Ana@1234");
  await c3.login("carla@areacomum.app", "Carla@1234");
  const salao3 = areaByName("Salão de festas");
  const quadra3 = areaByName("Quadra");
  const pendingSalon3 = first(
    "SELECT r.id FROM reservations r JOIN areas ar ON ar.id = r.area_id WHERE r.status = 'pendente' AND ar.name = 'Salão de festas' LIMIT 1",
  );

  const blockWithReservation = await s3.request("/api/blocks", {
    method: "POST",
    body: { areaId: salao3.id, date: localDate(5), reason: "Manutenção" },
  });
  record(
    "não bloqueia data que já tem reserva ativa (409)",
    blockWithReservation.status === 409 &&
      String(blockWithReservation.data?.error).includes("reserva"),
    blockWithReservation.data?.error,
  );

  const freeBlock = await s3.request("/api/blocks", {
    method: "POST",
    body: { areaId: quadra3.id, date: localDate(6), reason: "Pintura da quadra" },
  });
  record(
    "síndico bloqueia data livre para manutenção (201)",
    freeBlock.status === 201,
    `HTTP ${freeBlock.status}`,
  );

  const duplicateBlock = await s3.request("/api/blocks", {
    method: "POST",
    body: { areaId: quadra3.id, date: localDate(6), reason: "Repetido" },
  });
  record("não duplica bloqueio da mesma área/data (409)", duplicateBlock.status === 409, `HTTP ${duplicateBlock.status}`);

  const blockedBooking = await a3.request("/api/reservations", {
    method: "POST",
    body: {
      areaId: quadra3.id,
      date: localDate(6),
      startTime: "18:00",
      endTime: "20:00",
      guests: 5,
    },
  });
  record(
    "reserva em data bloqueada é recusada (409)",
    blockedBooking.status === 409 && String(blockedBooking.data?.error).includes("bloqueada"),
    blockedBooking.data?.error,
  );

  const removeBlock = await s3.request(`/api/blocks/${freeBlock.data.block.id}`, { method: "DELETE" });
  record("síndico remove bloqueio (200)", removeBlock.status === 200, `HTTP ${removeBlock.status}`);

  const afterUnblock = await a3.request("/api/reservations", {
    method: "POST",
    body: {
      areaId: quadra3.id,
      date: localDate(6),
      startTime: "18:00",
      endTime: "20:00",
      guests: 5,
    },
  });
  record(
    "após remover bloqueio a validação volta ao limite de reservas (409)",
    afterUnblock.status === 409 && String(afterUnblock.data?.error).includes("duas reservas futuras"),
    afterUnblock.data?.error,
  );

  const fineBooking = await c3.request("/api/reservations", {
    method: "POST",
    body: {
      areaId: quadra3.id,
      date: localDate(2),
      startTime: "20:00",
      endTime: "22:00",
      guests: 6,
    },
  });
  record(
    "apartamento com multa em aberto não faz reserva (409)",
    fineBooking.status === 409 && String(fineBooking.data?.error).includes("multa em aberto"),
    fineBooking.data?.error,
  );

  const openFine = first(
    `SELECT f.id FROM fines f JOIN apartments ap ON ap.id = f.apartment_id
      WHERE ap.label = 'A-303' AND f.status = 'aberta'`,
  );
  const otherApartmentPay = await a3.request(`/api/fines/${openFine.id}/pay`, {
    method: "POST",
    body: { method: "pix" },
  });
  record(
    "morador não paga multa de outro apartamento (403)",
    otherApartmentPay.status === 403,
    `HTTP ${otherApartmentPay.status}`,
  );

  const moradorPay = await c3.request(`/api/fines/${openFine.id}/pay`, {
    method: "POST",
    body: { method: "pix" },
  });
  record(
    "morador paga a própria multa via PIX (200 → paga com comprovante)",
    moradorPay.status === 200 &&
      moradorPay.data?.fine?.status === "paga" &&
      moradorPay.data?.payment?.method === "pix" &&
      Boolean(moradorPay.data?.payment?.receiptCode),
    `status: ${moradorPay.data?.fine?.status} · comprovante: ${moradorPay.data?.payment?.receiptCode ?? "—"}`,
  );

  const afterPay = await c3.request("/api/reservations", {
    method: "POST",
    body: {
      areaId: quadra3.id,
      date: localDate(2),
      startTime: "20:00",
      endTime: "22:00",
      guests: 6,
    },
  });
  record(
    "após pagar a multa o apartamento volta a reservar (201)",
    afterPay.status === 201,
    `HTTP ${afterPay.status}${afterPay.data?.error ? ` · ${afterPay.data.error}` : ""}`,
  );

  // =====================================================================
  section("4. Multa por cancelamento com menos de 24 horas");
  reseed();
  const d4 = new Client("Diego");
  const s4 = new Client("síndico");
  await d4.login("diego@areacomum.app", "Diego@1234");
  await s4.login("sindico@areacomum.app", "Sindico@123");
  const diegoToday = first(
    `SELECT r.id FROM reservations r
       JOIN areas ar ON ar.id = r.area_id
       JOIN apartments ap ON ap.id = r.apartment_id
      WHERE ar.name = 'Quadra' AND ap.label = 'A-404' AND r.date = ? AND r.status = 'confirmada'`,
    localDate(0),
  );
  const todayStart = new Date(`${localDate(0)}T19:00:00-03:00`).getTime();
  if (todayStart > Date.now()) {
    const lateCancel = await d4.request(`/api/reservations/${diegoToday.id}/cancel`, { method: "POST" });
    record(
      "cancelamento com menos de 24h gera multa de R$ 50,00",
      lateCancel.status === 200 &&
        lateCancel.data?.fineCreated === true &&
        lateCancel.data?.fineAmountCents === 5000,
      `multa criada: ${lateCancel.data?.fineCreated} · ${lateCancel.data?.fineAmountCents} centavos`,
    );

    const blockedByFine = await d4.request("/api/reservations", {
      method: "POST",
      body: {
        areaId: areaByName("Sala de reuniões").id,
        date: localDate(2),
        startTime: "09:00",
        endTime: "11:00",
        guests: 4,
      },
    });
    record(
      "multa recém-criada bloqueia nova reserva (409)",
      blockedByFine.status === 409 && String(blockedByFine.data?.error).includes("multa em aberto"),
      blockedByFine.data?.error,
    );

    const hist = html((await d4.request("/historico")).data);
    record(
      "multa aparece no histórico do apartamento",
      /multa/i.test(hist) && /50,00/.test(hist),
      "histórico contém a multa de R$ 50,00",
    );

    const diegoFine = first(
      `SELECT f.id FROM fines f JOIN apartments ap ON ap.id = f.apartment_id
        WHERE ap.label = 'A-404' AND f.status = 'aberta'`,
    );
    const adminPay = await s4.request(`/api/fines/${diegoFine.id}/pay`, { method: "POST" });
    record(
      "síndico registra quitação manual (200 → paga)",
      adminPay.status === 200 &&
        adminPay.data?.fine?.status === "paga" &&
        adminPay.data?.payment?.method === "manual",
      `status: ${adminPay.data?.fine?.status} · método: ${adminPay.data?.payment?.method}`,
    );
    const histAfterPay = html((await d4.request("/historico")).data);
    record(
      "comprovante do pagamento aparece no histórico",
      Boolean(adminPay.data?.payment?.receiptCode) &&
        histAfterPay.includes(adminPay.data.payment.receiptCode),
      `comprovante: ${adminPay.data?.payment?.receiptCode ?? "—"}`,
    );
  } else {
    record("cancelamento com menos de 24h gera multa", false, "fora da janela do dia — ignorado", true);
    record("multa bloqueia nova reserva", false, "fora da janela do dia — ignorado", true);
    record("multa aparece no histórico", false, "fora da janela do dia — ignorado", true);
  }

  // =====================================================================
  section("5. Controle de chaves pela portaria");
  reseed();
  const p5 = new Client("portaria");
  const d5 = new Client("Diego");
  await p5.login("portaria@areacomum.app", "Portaria@123");
  await d5.login("diego@areacomum.app", "Diego@1234");
  const diegoToday5 = first(
    `SELECT r.id FROM reservations r
       JOIN areas ar ON ar.id = r.area_id
       JOIN apartments ap ON ap.id = r.apartment_id
      WHERE ar.name = 'Quadra' AND ap.label = 'A-404' AND r.date = ? AND r.status = 'confirmada'`,
    localDate(0),
  );

  const returnBeforeDelivery = await p5.request(`/api/reservations/${diegoToday5.id}/keys`, {
    method: "POST",
    body: { action: "devolucao" },
  });
  record(
    "não registra devolução antes da entrega da chave (409)",
    returnBeforeDelivery.status === 409,
    returnBeforeDelivery.data?.error,
  );

  const delivery = await p5.request(`/api/reservations/${diegoToday5.id}/keys`, {
    method: "POST",
    body: { action: "entrega" },
  });
  record(
    "portaria registra a entrega da chave (200)",
    delivery.status === 200 && Boolean(delivery.data?.reservation?.keyDeliveredAt),
    `entrega: ${delivery.data?.reservation?.keyDeliveredAt}`,
  );

  const returnKey = await p5.request(`/api/reservations/${diegoToday5.id}/keys`, {
    method: "POST",
    body: { action: "devolucao" },
  });
  record(
    "portaria registra a devolução da chave (200)",
    returnKey.status === 200 && Boolean(returnKey.data?.reservation?.keyReturnedAt),
    `devolução: ${returnKey.data?.reservation?.keyReturnedAt}`,
  );

  const futureReservation = first(
    "SELECT r.id FROM reservations r JOIN areas ar ON ar.id = r.area_id WHERE ar.name = 'Salão de festas' AND r.status = 'pendente' LIMIT 1",
  );
  const futureKey = await p5.request(`/api/reservations/${futureReservation.id}/keys`, {
    method: "POST",
    body: { action: "entrega" },
  });
  record(
    "portaria não registra chave de reserva de outro dia (403)",
    futureKey.status === 403,
    `HTTP ${futureKey.status}`,
  );

  const moradorKey = await d5.request(`/api/reservations/${diegoToday5.id}/keys`, {
    method: "POST",
    body: { action: "entrega" },
  });
  record("morador não registra chave (403)", moradorKey.status === 403, `HTTP ${moradorKey.status}`);

  const todayList = await p5.request(`/api/reservations?date=${localDate(0)}`);
  const keyState = todayList.data?.reservations?.find((item) => item.id === diegoToday5.id);
  record(
    "estado das chaves fica visível na lista do dia",
    Boolean(keyState?.keyDeliveredAt) && Boolean(keyState?.keyReturnedAt),
    "entrega e devolução registradas",
  );

  // =====================================================================
  section("6. Cadastro de áreas e regras pelo síndico");
  reseed();
  const s6 = new Client("síndico");
  const a6 = new Client("Ana");
  await s6.login("sindico@areacomum.app", "Sindico@123");
  await a6.login("ana@areacomum.app", "Ana@1234");

  const newArea = await s6.request("/api/areas", {
    method: "POST",
    body: {
      name: "Espaço gourmet",
      description: "Área de testes",
      guestLimit: 25,
      requiresApproval: true,
      minAdvanceDays: 2,
      openTime: "10:00",
      closeTime: "22:00",
    },
  });
  record(
    "síndico cadastra nova área com regras (201)",
    newArea.status === 201 && newArea.data?.area?.requiresApproval === true,
    `HTTP ${newArea.status}`,
  );

  const duplicateArea = await s6.request("/api/areas", {
    method: "POST",
    body: {
      name: "Espaço gourmet",
      guestLimit: 10,
      minAdvanceDays: 0,
      openTime: "08:00",
      closeTime: "22:00",
    },
  });
  record("não permite duas áreas com o mesmo nome (409)", duplicateArea.status === 409, `HTTP ${duplicateArea.status}`);

  const updateArea = await s6.request(`/api/areas/${newArea.data.area.id}`, {
    method: "PATCH",
    body: {
      name: "Espaço gourmet",
      description: "Área de testes atualizada",
      guestLimit: 30,
      requiresApproval: false,
      minAdvanceDays: 0,
      openTime: "10:00",
      closeTime: "23:00",
    },
  });
  record(
    "síndico edita as regras de uma área (200)",
    updateArea.status === 200 &&
      updateArea.data?.area?.guestLimit === 30 &&
      updateArea.data?.area?.requiresApproval === false,
    `limite: ${updateArea.data?.area?.guestLimit}`,
  );

  const anaAreaPage = await a6.request("/admin");
  record(
    "morador não acessa o painel de áreas",
    isRedirect(anaAreaPage.status),
    `HTTP ${anaAreaPage.status}`,
  );

  // =====================================================================
  section("Restaurando os dados de exemplo para a demonstração");
  reseed();
  record("dados de exemplo restaurados", true);

  console.log("\n" + "=".repeat(70));
  console.log(`RESULTADO: ${passed} passaram · ${failed} falharam · ${skipped} ignorados`);
  console.log("=".repeat(70));
  for (const item of results.filter((item) => item.status === "FALHOU")) {
    console.log(`❌ ${item.name} — ${item.detail}`);
  }

  if (failed > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error("\nErro fatal durante os testes:", error);
  process.exitCode = 1;
});
