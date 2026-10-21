# Área Comum · Condomínio São Cristóvão

Sistema completo de reservas das áreas comuns do condomínio — **salão de festas, churrasqueira,
quadra e sala de reuniões** — com visual editorial (creme, verde profundo e dourado), o logo
oficial do condomínio, calendário mensal, pagamentos simulados e central de notificações.

Stack: **Next.js 15 (App Router) + TypeScript + Tailwind CSS + SQLite (better-sqlite3)**.
Login próprio com sessão em cookie `httpOnly` e senhas guardadas com **scrypt + salt**.

---

## Como rodar

Pré-requisitos: Node.js 20+ e pnpm.

```bash
cd area-comum
pnpm install        # builds nativos de better-sqlite3/esbuild já liberados em pnpm-workspace.yaml
pnpm seed           # cria os dados de exemplo
pnpm dev            # http://localhost:3000
```

Produção:

```bash
pnpm build
pnpm start          # http://localhost:3000
```

O banco fica em `data/area-comum.db` (criado automaticamente). Para usar outro caminho, defina
`DB_PATH`.

## Hospedagem e link público

O guia completo está em [DEPLOY.md](DEPLOY.md):

- **Link temporário imediato:** Cloudflare Quick Tunnel (sem conta, enquanto o computador e o
  servidor estiverem ligados).
- **Hospedagem gratuita permanente:** Render (plano free) com deploy a partir do GitHub, usando o
  `render.yaml` e o script `scripts/start-prod.mjs` já incluídos.

Em produção, o Render executa `node scripts/start-prod.mjs`, que cria os dados de exemplo no
primeiro boot e sobe o Next.js. O plano free dorme após alguns minutos sem acesso e o banco SQLite
é recriado a cada reinício; para dados realmente persistentes seria necessário disco pago ou banco
gerenciado.

## Contas de exemplo

| Perfil   | Apartamento | E-mail                   | Senha          |
| -------- | ----------- | ------------------------ | -------------- |
| Síndico  | —           | `sindico@areacomum.app`  | `Sindico@123`  |
| Portaria | —           | `portaria@areacomum.app` | `Portaria@123` |
| Morador  | A-101       | `ana@areacomum.app`      | `Ana@1234`     |
| Morador  | A-202       | `bruno@areacomum.app`    | `Bruno@1234`   |
| Morador  | A-303       | `carla@areacomum.app`    | `Carla@1234`   |
| Morador  | A-404       | `diego@areacomum.app`    | `Diego@1234`   |

A tela de login tem atalhos que preenchem as credenciais. Os dados de exemplo incluem reservas
espalhadas pelo mês, **duas solicitações pendentes de aprovação**, **uma multa em aberto** no
A-303, duas reservas para hoje na portaria e notificações iniciais para demonstrar a central.

## Apresentação para o condomínio

- [Apresentacao-Area-Comum-Sao-Cristovao.pdf](apresentacao/Apresentacao-Area-Comum-Sao-Cristovao.pdf) — versão final em PDF.
- [Apresentacao-Area-Comum-Sao-Cristovao.pptx](apresentacao/Apresentacao-Area-Comum-Sao-Cristovao.pptx) — versão editável em PowerPoint.

A apresentação tem 12 páginas, com o diagnóstico, a solução, as telas reais de cada perfil, as
regras garantidas no servidor, pagamentos, notificações, segurança, benefícios e o caminho de
implantação. O link de demonstração aparece na última página.

## Páginas

| Rota | Perfil | O que faz |
| --- | --- | --- |
| `/login`, `/cadastro` | público | Login e cadastro de morador, com logo do condomínio em marca d'água |
| `/inicio` | morador | Visão geral: saudação, próxima reserva, apartamento, calendário do mês, áreas e notificações |
| `/agenda` | morador e síndico | Calendário mensal + reservas do dia por área + regras |
| `/agenda/[areaId]` | morador e síndico | Agenda de 21 dias da área, regras e nova reserva |
| `/minhas` | morador | Reservas futuras do apartamento e cancelamento |
| `/historico` | morador | Histórico completo, multas, pagamentos e comprovantes |
| `/admin` | síndico | Aprovações, áreas e regras, manutenção, multas e uso do mês |
| `/portaria` | portaria | Reservas do dia, nome/apto/convidados e controle de chaves |

## Visual

- Paleta creme (`#F7F2E8`), verde profundo (`#122F27`) e dourado (`#E0AD43`), inspirada no logo
  oficial São Cristóvão (amarelo, vermelho e azul).
- Tipografia serifada nos títulos e sans-serif no corpo.
- Logo oficial tratado e aplicado em versões com fundo transparente, badge e marca d'água
  (`public/brand/`).
- Cards editoriais, chips de regras, calendário mensal com pontos por área e menus com subtítulos.

## Regras de negócio (todas validadas no servidor)

| Regra | Onde é garantida |
| --- | --- |
| Sem duas reservas no mesmo horário na mesma área | `lib/reservations.ts` → sobreposição de horários + consulta ao SQLite |
| Máximo de 2 reservas futuras por apartamento | `lib/reservations.ts` → contagem de reservas ativas futuras |
| Salão e churrasqueira: 3 dias de antecedência + aprovação do síndico | `lib/areas.ts` + `lib/reservations.ts` |
| Quadra e sala de reuniões confirmadas na hora | `lib/reservations.ts` |
| Limite de convidados por área | `lib/reservations.ts` (`guest_limit`) |
| Cancelamento com menos de 24 h gera multa de R$ 50,00 | `lib/reservations.ts` → cria registro em `fines` |
| Apartamento com multa em aberto não faz reserva nova | `lib/reservations.ts` |
| Portaria vê só as reservas do dia, com nome/apto/convidados | `lib/reservations.ts` + rotas e páginas |
| Síndico cadastra áreas/regras, aprova/recusa, bloqueia datas e vê uso do mês | `lib/areas.ts`, `lib/blocks.ts`, `lib/reservations.ts`, `lib/usage.ts` |
| Cada papel só acessa o que lhe cabe | `lib/auth.ts` + checagens em serviços, APIs e páginas |

## Calendário mensal

- `lib/calendar.ts` monta o mês (dias, reservas por área, bloqueios) e a faixa de 21 dias por área.
- `components/MonthCalendar.tsx` desenha o calendário no painel do morador e na agenda.
- Dias com reserva mostram pontos coloridos por área; dias com manutenção têm uma marca dourada.
- Clicar no dia atualiza a agenda e as reservas daquele dia.

## Pagamentos

- Multas abertas podem ser pagas pelo morador em `/historico` ou `/minhas`, via **PIX** ou
  **cartão** simulados.
- Ao confirmar, o servidor quita a multa, gera **comprovante** (`SC-...`) e grava em `payments`.
- O síndico também pode registrar a quitação manual no painel.
- O pagamento é simulado (sem gateway real); em produção seria integrado a um PSP PIX.
- Multa paga aparece no histórico do apartamento com método, data e comprovante.

## Notificações

`lib/notifications.ts` gera avisos persistidos no banco para cada evento:

- reserva criada (confirmada ou pendente) e aprovação/recusa;
- cancelamento e multa gerada;
- multa paga (morador e síndico recebem);
- chave entregue/devolvida pela portaria;
- manutenção programada pelo síndico.

A central fica no sino da barra lateral (e no topo no celular), com contador de não lidas e opção de
marcar todas como lidas. API: `GET /api/notifications` e `POST /api/notifications/read`.

## Testes

Com o servidor rodando:

```bash
pnpm test:rules
```

O script recria os dados de exemplo entre os grupos e testa autenticação, hash de senha,
permissões por papel, notificações, conflito de horário, limite de convidados, antecedência, limite
de 2 reservas futuras, aprovação/recusa, bloqueio de manutenção, multa por cancelamento tardio,
bloqueio por multa em aberto, pagamento via PIX e quitação manual, comprovante no histórico e
controle de chaves. Resultado atual: **76 passaram, 0 falharam**.

Capturas de tela: `pnpm screens` (Chrome/Edge; use `CHROME_PATH` se necessário). As imagens ficam em
`screenshots/`.

## Estrutura

```
app/                    páginas e rotas de API (App Router)
components/             UI (login, calendário, agenda, pagamento, notificações, painel)
lib/db.ts               conexão SQLite, schema, migrações de tabelas
lib/password.ts         hash/verificação de senha com scrypt
lib/auth.ts             sessões, cookie e guardas de papel
lib/areas.ts            cadastro/edição de áreas e regras
lib/reservations.ts     regras de reserva, aprovação, cancelamento e chaves
lib/blocks.ts           bloqueios de manutenção
lib/fines.ts            multas
lib/payments.ts         pagamentos e comprovantes
lib/notifications.ts    notificações
lib/calendar.ts         calendário mensal e faixa de dias
lib/usage.ts            painel de uso mensal
public/brand/           logo oficial tratado (transparente, badge e marca d'água)
scripts/seed.ts         dados de exemplo
scripts/test-rules.mjs  testes de regras via API
scripts/screenshots.mjs capturas de tela
```

## Decisões e observações

- **Fuso**: o condomínio opera no horário de Brasília (`America/Sao_Paulo`, UTC−03:00).
- **Sessão**: token aleatório de 32 bytes; no banco guarda-se apenas o SHA-256 do token. Cookie
  `httpOnly`, `sameSite=lax`, validade de 7 dias. Em produção HTTPS, defina `COOKIE_SECURE=true`.
- **Cadastro público**: qualquer pessoa pode se cadastrar como morador, mas não é possível assumir
  um apartamento que já tenha morador cadastrado. Em um condomínio real, o cadastro passaria por
  aprovação do síndico.
- **Pagamento**: simulado para demonstração; nenhum valor real é cobrado.
- **Notificações**: internas ao sistema; não há envio por e-mail/WhatsApp nesta versão.
- **Bloqueio de manutenção**: bloqueia o dia inteiro da área; se houver reserva ativa no dia, o
  bloqueio é recusado até que as reservas sejam canceladas.
- **Banco de demonstração**: os dados são fictícios e o `pnpm seed` restaura o estado inicial.
