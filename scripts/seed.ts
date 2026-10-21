/**
 * Popula o banco com dados de exemplo do condomínio.
 * Uso: pnpm seed
 */
import { getDb, resetDatabase } from "../lib/db";
import { hashPassword } from "../lib/password";
import { addDays, todayISO } from "../lib/time";
import { notifyUser } from "../lib/notifications";

process.env.TZ = process.env.TZ ?? "America/Sao_Paulo";

const db = getDb();
resetDatabase(db);

const nowIso = () => new Date().toISOString();
const isoDaysAgo = (days: number, hour = 12) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const today = todayISO();
const day = (offset: number) => addDays(today, offset);

const insertApartment = db.prepare(
  "INSERT INTO apartments (block, number, label, created_at) VALUES (?, ?, ?, ?)",
);
const insertUser = db.prepare(
  `INSERT INTO users (name, email, password_hash, role, apartment_id, created_at)
   VALUES (?, ?, ?, ?, ?, ?)`,
);
const insertArea = db.prepare(
  `INSERT INTO areas
     (name, description, guest_limit, requires_approval, min_advance_days, open_time, close_time, active, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
);
const insertReservation = db.prepare(
  `INSERT INTO reservations
     (area_id, apartment_id, user_id, date, start_time, end_time, guests, status, notes,
      created_at, decided_by, decided_at, cancelled_at, cancelled_by, key_delivered_at, key_returned_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const insertFine = db.prepare(
  `INSERT INTO fines (apartment_id, reservation_id, amount_cents, status, reason, created_at)
   VALUES (?, ?, ?, 'aberta', ?, ?)`,
);

interface ApartmentSeed {
  id: number;
  label: string;
}

const seed = db.transaction(() => {
  const apartments: Record<string, ApartmentSeed> = {};
  for (const [block, number] of [
    ["A", "101"],
    ["A", "202"],
    ["A", "303"],
    ["A", "404"],
  ]) {
    const label = `${block}-${number}`;
    const result = insertApartment.run(block, number, label, nowIso());
    apartments[label] = { id: Number(result.lastInsertRowid), label };
  }

  const passwordFor = (plain: string) => hashPassword(plain);
  const users: Record<string, number> = {};

  const createUser = (
    key: string,
    name: string,
    email: string,
    password: string,
    role: "morador" | "sindico" | "porteiro",
    apartmentLabel?: string,
  ) => {
    const apartmentId = apartmentLabel ? apartments[apartmentLabel].id : null;
    const result = insertUser.run(
      name,
      email,
      passwordFor(password),
      role,
      apartmentId,
      isoDaysAgo(60, 9),
    );
    users[key] = Number(result.lastInsertRowid);
  };

  createUser("sindico", "Sônia Ribeiro", "sindico@areacomum.app", "Sindico@123", "sindico");
  createUser("porteiro", "Paulo Andrade", "portaria@areacomum.app", "Portaria@123", "porteiro");
  createUser("ana", "Ana Souza", "ana@areacomum.app", "Ana@1234", "morador", "A-101");
  createUser("bruno", "Bruno Lima", "bruno@areacomum.app", "Bruno@1234", "morador", "A-202");
  createUser("carla", "Carla Mendes", "carla@areacomum.app", "Carla@1234", "morador", "A-303");
  createUser("diego", "Diego Rocha", "diego@areacomum.app", "Diego@1234", "morador", "A-404");

  const areas: Record<string, number> = {};
  const createArea = (
    name: string,
    description: string,
    guestLimit: number,
    requiresApproval: boolean,
    minAdvanceDays: number,
    openTime: string,
    closeTime: string,
  ) => {
    const result = insertArea.run(
      name,
      description,
      guestLimit,
      requiresApproval ? 1 : 0,
      minAdvanceDays,
      openTime,
      closeTime,
      nowIso(),
    );
    areas[name] = Number(result.lastInsertRowid);
  };

  createArea(
    "Salão de festas",
    "Salão com mesas, cadeiras, cozinha de apoio e som ambiente.",
    80,
    true,
    3,
    "08:00",
    "23:00",
  );
  createArea(
    "Churrasqueira",
    "Churrasqueira coberta com bancada, pia e mesas externas.",
    30,
    true,
    3,
    "08:00",
    "22:00",
  );
  createArea(
    "Quadra",
    "Quadra poliesportiva descoberta, com iluminação noturna.",
    20,
    false,
    0,
    "07:00",
    "22:00",
  );
  createArea(
    "Sala de reuniões",
    "Sala climatizada com mesa para 12 pessoas e TV.",
    12,
    false,
    0,
    "08:00",
    "20:00",
  );

  const reserve = (input: {
    area: string;
    apartment: string;
    resident: string;
    date: string;
    start: string;
    end: string;
    guests: number;
    status: "pendente" | "confirmada" | "recusada" | "cancelada";
    notes?: string;
    createdAt?: string;
    decidedBy?: number | null;
    decidedAt?: string | null;
    cancelledAt?: string | null;
    cancelledBy?: number | null;
    keyDeliveredAt?: string | null;
    keyReturnedAt?: string | null;
  }) => {
    const result = insertReservation.run(
      areas[input.area],
      apartments[input.apartment].id,
      users[input.resident],
      input.date,
      input.start,
      input.end,
      input.guests,
      input.status,
      input.notes ?? "",
      input.createdAt ?? isoDaysAgo(7, 10),
      input.decidedBy ?? null,
      input.decidedAt ?? null,
      input.cancelledAt ?? null,
      input.cancelledBy ?? null,
      input.keyDeliveredAt ?? null,
      input.keyReturnedAt ?? null,
    );
    return Number(result.lastInsertRowid);
  };

  // Histórico espalhado pelo mês
  reserve({
    area: "Quadra",
    apartment: "A-101",
    resident: "ana",
    date: day(-10),
    start: "18:00",
    end: "20:00",
    guests: 10,
    status: "confirmada",
    notes: "Campeonato de vôlei do prédio.",
    createdAt: isoDaysAgo(20, 10),
  });
  reserve({
    area: "Quadra",
    apartment: "A-404",
    resident: "diego",
    date: day(-8),
    start: "18:00",
    end: "20:00",
    guests: 8,
    status: "confirmada",
    createdAt: isoDaysAgo(18, 11),
  });
  reserve({
    area: "Sala de reuniões",
    apartment: "A-303",
    resident: "carla",
    date: day(-6),
    start: "10:00",
    end: "12:00",
    guests: 6,
    status: "confirmada",
    notes: "Reunião do conselho fiscal.",
    createdAt: isoDaysAgo(15, 9),
  });
  reserve({
    area: "Churrasqueira",
    apartment: "A-404",
    resident: "diego",
    date: day(-5),
    start: "12:00",
    end: "16:00",
    guests: 15,
    status: "recusada",
    notes: "Pedido de confraternização.",
    createdAt: isoDaysAgo(12, 14),
    decidedBy: users.sindico,
    decidedAt: isoDaysAgo(11, 9),
  });
  const cancelledReservation = reserve({
    area: "Churrasqueira",
    apartment: "A-303",
    resident: "carla",
    date: day(-2),
    start: "12:00",
    end: "16:00",
    guests: 12,
    status: "cancelada",
    notes: "Aniversário de família.",
    createdAt: isoDaysAgo(10, 18),
    cancelledAt: isoDaysAgo(3, 14),
    cancelledBy: users.carla,
  });
  insertFine.run(
    apartments["A-303"].id,
    cancelledReservation,
    5000,
    "Cancelamento com menos de 24 horas de antecedência.",
    isoDaysAgo(3, 14),
  );

  reserve({
    area: "Sala de reuniões",
    apartment: "A-202",
    resident: "bruno",
    date: today,
    start: "10:00",
    end: "12:00",
    guests: 4,
    status: "confirmada",
    notes: "Reunião de trabalho.",
    createdAt: isoDaysAgo(4, 16),
    keyDeliveredAt: `${today}T12:55:00.000Z`,
  });
  reserve({
    area: "Quadra",
    apartment: "A-404",
    resident: "diego",
    date: today,
    start: "19:00",
    end: "21:00",
    guests: 12,
    status: "confirmada",
    notes: "Futebol com os amigos.",
    createdAt: isoDaysAgo(2, 15),
  });
  reserve({
    area: "Quadra",
    apartment: "A-101",
    resident: "ana",
    date: day(2),
    start: "18:00",
    end: "20:00",
    guests: 10,
    status: "confirmada",
    createdAt: isoDaysAgo(2, 11),
  });
  reserve({
    area: "Quadra",
    apartment: "A-202",
    resident: "bruno",
    date: day(3),
    start: "18:00",
    end: "20:00",
    guests: 14,
    status: "confirmada",
    createdAt: isoDaysAgo(2, 12),
  });
  reserve({
    area: "Salão de festas",
    apartment: "A-101",
    resident: "ana",
    date: day(5),
    start: "19:00",
    end: "23:00",
    guests: 60,
    status: "pendente",
    notes: "Festa de aniversário de 50 anos.",
    createdAt: isoDaysAgo(1, 20),
  });
  reserve({
    area: "Churrasqueira",
    apartment: "A-202",
    resident: "bruno",
    date: day(8),
    start: "12:00",
    end: "16:00",
    guests: 25,
    status: "pendente",
    notes: "Churrasco de família.",
    createdAt: isoDaysAgo(2, 19),
  });
  reserve({
    area: "Salão de festas",
    apartment: "A-404",
    resident: "diego",
    date: day(10),
    start: "19:00",
    end: "23:00",
    guests: 40,
    status: "confirmada",
    notes: "Formatura da filha.",
    createdAt: isoDaysAgo(6, 10),
    decidedBy: users.sindico,
    decidedAt: isoDaysAgo(5, 9),
  });
});

seed();

// Avisos iniciais para a central de notificações
const userIdByEmail = (email: string) =>
  (db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number }).id;
const br = (date: string) => date.split("-").reverse().join("/");

notifyUser(userIdByEmail("ana@areacomum.app"), {
  type: "reserva",
  title: "Solicitação de reserva enviada",
  message: `Salão de festas · ${br(day(5))} · 19:00–23:00 · aguardando aprovação do síndico.`,
  link: "/minhas",
});
notifyUser(userIdByEmail("ana@areacomum.app"), {
  type: "reserva",
  title: "Reserva confirmada",
  message: `Quadra · ${br(day(2))} · 18:00–20:00 · 10 convidados.`,
  link: "/minhas",
});
notifyUser(userIdByEmail("sindico@areacomum.app"), {
  type: "aprovacao",
  title: "Nova solicitação de reserva",
  message: `Apto A-101 · Salão de festas em ${br(day(5))}, 19:00–23:00. Aguardando sua análise.`,
  link: "/admin#aprovacoes",
});
notifyUser(userIdByEmail("carla@areacomum.app"), {
  type: "multa",
  title: "Multa em aberto",
  message: `Cancelamento com menos de 24 horas na Churrasqueira. Valor: R$ 50,00.`,
  link: "/historico",
});
notifyUser(userIdByEmail("portaria@areacomum.app"), {
  type: "chave",
  title: "Reservas de hoje",
  message: "2 reservas confirmadas para hoje: A-202 (Sala de reuniões) e A-404 (Quadra).",
  link: "/portaria",
});

const counts = {
  usuarios: (db.prepare("SELECT COUNT(*) AS total FROM users").get() as { total: number }).total,
  apartamentos: (
    db.prepare("SELECT COUNT(*) AS total FROM apartments").get() as { total: number }
  ).total,
  areas: (db.prepare("SELECT COUNT(*) AS total FROM areas").get() as { total: number }).total,
  reservas: (
    db.prepare("SELECT COUNT(*) AS total FROM reservations").get() as { total: number }
  ).total,
  multas: (db.prepare("SELECT COUNT(*) AS total FROM fines").get() as { total: number }).total,
};

console.log("Dados de exemplo criados com sucesso:");
console.log(counts);
console.log(`
Contas de acesso
----------------
Síndico:   sindico@areacomum.app  /  Sindico@123
Porteiro:  portaria@areacomum.app /  Portaria@123
Morador:   ana@areacomum.app      /  Ana@1234      (A-101)
Morador:   bruno@areacomum.app    /  Bruno@1234    (A-202)
Morador:   carla@areacomum.app    /  Carla@1234    (A-303)
Morador:   diego@areacomum.app    /  Diego@1234    (A-404)
`);
