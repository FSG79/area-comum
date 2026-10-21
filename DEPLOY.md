# Publicar o Área Comum na internet (gratuitamente)

Este guia cobre duas formas:

1. **Link temporário agora** — Cloudflare Quick Tunnel, sem conta, ideal para mostrar hoje ao cliente.
2. **Hospedagem gratuita permanente** — Render, com URL pública estável e deploy automático do GitHub.

---

## 1. Link público imediato (temporário)

O site pode ser exposto com um túnel gratuito do Cloudflare. **Nenhuma conta é necessária** e o link
funciona em qualquer dispositivo com internet enquanto este computador, o servidor (`pnpm start`) e
o túnel estiverem ligados.

### No Windows

1. Baixe o `cloudflared` uma única vez:

   ```powershell
   Invoke-WebRequest `
     -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" `
     -OutFile "$env:USERPROFILE\Downloads\cloudflared.exe"
   ```

2. Com o site rodando em `http://localhost:3000`, abra outro PowerShell e execute:

   ```powershell
   & "$env:USERPROFILE\Downloads\cloudflared.exe" tunnel --url http://localhost:3000
   ```

3. O terminal mostra uma URL parecida com:

   ```text
   https://algum-nome-aleatorio.trycloudflare.com
   ```

   Envie **essa URL** para o cliente. Ela abre o sistema completo (login, agenda, calendário,
   pagamentos simulados, notificações e painel do síndico).

### Limitações do túnel

- É temporário: para quando o computador, o Next.js ou o túnel forem fechados.
- A URL muda cada vez que o túnel é reiniciado.
- Não tem garantia de disponibilidade (Cloudflare deixa isso explícito).
- Para uma demonstração, é a opção mais rápida. Para um link estável, use o Render abaixo.

### Link atual deste projeto

Enquanto esta sessão/processo estiver ativo, o link público é:

```text
https://afford-ict-switches-distributed.trycloudflare.com
```

> Esse endereço expira quando o túnel for encerrado. Use o Render para um link fixo.

---

## 2. Hospedagem gratuita permanente no Render

O Render oferece **Web Service gratuito** (sem cartão de crédito) com HTTPS e deploy automático a
partir do GitHub. O projeto já está preparado com:

- `render.yaml` — configuração pronta (build, start, variáveis e plano free);
- `scripts/start-prod.mjs` — cria os dados de exemplo no primeiro boot e inicia o Next.js;
- `.node-version` — Node 22;
- `package.json` com `start:prod`.

### Passo 1 — Publicar o projeto no GitHub

O Render precisa do código em um repositório Git. O jeito mais simples, sem usar terminal:

1. Crie uma conta em [github.com](https://github.com) (gratuita).
2. Instale o [GitHub Desktop](https://desktop.github.com/) (gratuito).
3. No GitHub Desktop: **File → Add local repository** e escolha a pasta
   `area-comum` (dentro de `Downloads\Deepseek Harness`).
4. Se ele avisar que não é um repositório, aceite **create a repository**.
5. Escreva a mensagem de commit (ex.: `Área Comum`) e clique em **Commit to main**.
6. Clique em **Publish repository**.
   - Pode deixar **Private** (recomendado) ou **Public**.
   - O `.gitignore` já exclui `node_modules`, `.next`, banco local e capturas de tela.

> Alternativa com Git instalado: `git init`, `git add .`, `git commit -m "Área Comum"`, criar o
> repositório no GitHub e `git remote add origin ... && git push -u origin main`.

### Passo 2 — Criar a conta no Render

1. Acesse [render.com](https://render.com) e crie uma conta gratuita.
2. Escolha entrar com GitHub e autorize o Render a acessar o repositório.

### Passo 3 — Deploy com Blueprint (mais fácil)

1. No painel do Render, clique em **New + → Blueprint**.
2. Selecione o repositório `area-comum`.
3. O Render lê o `render.yaml` e mostra o serviço `area-comum`.
4. Clique em **Apply** (ou **Create**).
5. Aguarde o primeiro build (3 a 8 minutos). O log mostra:
   - instalação das dependências;
   - `pnpm build`;
   - criação automática dos dados de exemplo no primeiro boot.
6. Ao terminar, o Render fornece uma URL como:

   ```text
   https://area-comum.onrender.com
   ```

   (o sufixo pode variar; use a URL mostrada no painel)

### Passo 4 — Conferir

1. Abra a URL no celular ou em outro computador.
2. Faça login com uma conta de demonstração.
3. Navegue pela visão geral, agenda, calendário, histórico e painel do síndico.
4. Envie a URL ao cliente.

### Se preferir criar o serviço manualmente

Em vez do Blueprint, use **New + → Web Service**:

| Campo | Valor |
| --- | --- |
| Repository | seu repositório `area-comum` |
| Name | `area-comum` |
| Language / Runtime | Node |
| Branch | `main` |
| Region | a mais próxima (ex.: Oregon) |
| Build Command | `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm build` |
| Start Command | `node scripts/start-prod.mjs` |
| Instance Type | Free |

Variáveis de ambiente:

| Chave | Valor |
| --- | --- |
| `NODE_VERSION` | `22` |
| `COOKIE_SECURE` | `true` |
| `NODE_ENV` | `production` |

### Limitações do plano gratuito do Render

- O serviço **dorme após ~15 minutos sem acesso**. A primeira visita depois disso pode levar
  30–60 segundos para acordar.
- O disco é **efêmero**: os dados do SQLite são recriados a partir dos dados de exemplo quando o
  serviço é reiniciado ou publicado novamente. Para uma demonstração, isso é aceitável — a cada
  reinício o sistema volta ao estado inicial.
- Para dados realmente persistentes, as opções são:
  - Render com disco persistente (plano pago); ou
  - migrar o banco para um serviço gerenciado gratuito (ex.: Turso/libSQL ou Neon/Postgres), o que
    exige uma pequena adaptação no código.
- O link do Render é estável enquanto o serviço existir.

### Atualizações futuras

Depois de publicar no GitHub, qualquer `git push` (ou **Push origin** no GitHub Desktop) dispara
novo deploy automático no Render.

### Segurança antes de usar com dados reais

- Troque as senhas de demonstração e remova as contas de exemplo.
- Mantenha `COOKIE_SECURE=true` (HTTPS).
- Não use dados reais de moradores em um link público de demonstração.
- Faça backup do banco se optar por um disco persistente.

---

## Resumo rápido

| Objetivo | Solução | Link |
| --- | --- | --- |
| Mostrar hoje, sem cadastro | Cloudflare Quick Tunnel | `https://...trycloudflare.com` (temporário) |
| Link fixo gratuito | Render + GitHub | `https://area-comum.onrender.com` (free) |
| Dados persistentes | Render com disco pago ou banco gerenciado | requer adaptação/plano |

Se quiser, posso acompanhar o deploy: basta publicar o repositório e me enviar a URL do Render
para eu validar o login e as telas em produção.
