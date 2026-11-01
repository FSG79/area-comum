# Relatório de testes — Área Comum · Condomínio Exemplo

Execução em **20/10/2026**, com o build de produção (`pnpm build` + `pnpm start`) rodando em
`http://127.0.0.1:3000`. O script recria os dados de exemplo entre os grupos e, ao final, restaura o
estado de demonstração.

**Resultado final: 76 testes passaram, 0 falharam, 0 ignorados.**

## 1. Autenticação, hash de senha e permissões

| Teste | Resultado |
| --- | --- |
| Login com as 6 contas de exemplo (síndico, portaria e 4 moradores) | ✅ |
| Login do morador redireciona para a visão geral (`/inicio`) | ✅ |
| Login recusa senha incorreta e e-mail inexistente (401) | ✅ |
| Senhas guardadas com hash scrypt + salt, sem texto puro | ✅ |
| Reserva e consulta sem login são bloqueadas (401) | ✅ |
| Morador não cadastra área, não aprova reserva e não registra chave (403) | ✅ |
| Portaria não consulta reservas de outro dia (403) | ✅ |
| Portaria consulta apenas as reservas de hoje | ✅ |
| Morador consulta a agenda de outros dias (200) | ✅ |
| Central de notificações entrega avisos do morador | ✅ |
| Notificações podem ser marcadas como lidas | ✅ |
| Notificações são individuais por usuário | ✅ |
| Páginas protegidas redirecionam por papel (`/login`, `/inicio`, `/agenda`, `/admin`, `/portaria`) | ✅ |
| Tela da portaria não expõe reservas futuras nem outros apartamentos | ✅ |
| Painel do síndico mostra aprovações e uso do mês | ✅ |
| Agenda lista as 4 áreas e as regras | ✅ |
| Histórico mostra somente o apartamento do morador | ✅ |
| Cadastro cria conta/sessão, recusa e-mail duplicado e apartamento ocupado | ✅ |
| Login aceita e-mail com maiúsculas e logout invalida sessão | ✅ |

## 2. Reservas, conflitos e aprovação

| Teste | Resultado |
| --- | --- |
| Salão recusa reserva com menos de 3 dias de antecedência (400) | ✅ |
| Limite de convidados da área é respeitado (400) | ✅ |
| Apartamento com 2 reservas futuras não faz outra (409) | ✅ |
| Reserva fora do horário de funcionamento é recusada (400) | ✅ |
| Reserva em horário já passado é recusada (400) | ✅ |
| Cancelamento com mais de 24 h não gera multa | ✅ |
| Cancelamento de solicitação pendente com mais de 24 h não gera multa | ✅ |
| Salão com 3 dias entra como pendente de aprovação (201) | ✅ |
| Reserva pendente gera notificação para o morador e para o síndico | ✅ |
| Quadra é confirmada na hora (201) | ✅ |
| Não permite duas reservas no mesmo horário na mesma área (409) | ✅ |
| Limite de 2 reservas futuras também vale após novas reservas (409) | ✅ |
| Morador não cancela reserva de outro apartamento (403) | ✅ |
| Síndico aprova reserva pendente (200 → confirmada) | ✅ |
| Não aprova duas vezes a mesma reserva (409) | ✅ |
| Síndico recusa reserva pendente (200 → recusada) | ✅ |
| Sala de reuniões é confirmada na hora (201) | ✅ |
| Churrasqueira também exige 3 dias de antecedência (400) | ✅ |

## 3. Bloqueio de manutenção, multa em aberto e pagamento

| Teste | Resultado |
| --- | --- |
| Não bloqueia data que já tem reserva ativa (409) | ✅ |
| Síndico bloqueia data livre (201) / não duplica bloqueio (409) | ✅ |
| Reserva em data bloqueada é recusada (409) | ✅ |
| Síndico remove bloqueio (200) | ✅ |
| Apartamento com multa em aberto não faz reserva (409) | ✅ |
| Morador não paga multa de outro apartamento (403) | ✅ |
| Morador paga a própria multa via PIX, com comprovante (200 → paga) | ✅ |
| Após pagar a multa o apartamento volta a reservar (201) | ✅ |

## 4. Multa por cancelamento tardio e histórico

| Teste | Resultado |
| --- | --- |
| Cancelamento com menos de 24 h gera multa de R$ 50,00 | ✅ |
| Multa recém-criada bloqueia nova reserva (409) | ✅ |
| Multa aparece no histórico do apartamento | ✅ |
| Síndico registra quitação manual (200 → paga) | ✅ |
| Comprovante do pagamento aparece no histórico | ✅ |

## 5. Controle de chaves pela portaria

| Teste | Resultado |
| --- | --- |
| Não registra devolução antes da entrega (409) | ✅ |
| Portaria registra entrega e devolução da chave (200) | ✅ |
| Portaria não registra chave de reserva de outro dia (403) | ✅ |
| Morador não registra chave (403) | ✅ |
| Estado das chaves fica visível na lista do dia | ✅ |

## 6. Cadastro de áreas e regras

| Teste | Resultado |
| --- | --- |
| Síndico cadastra nova área com regras (201) | ✅ |
| Não permite duas áreas com o mesmo nome (409) | ✅ |
| Síndico edita limite de convidados/aprovação (200) | ✅ |
| Morador não acessa o painel de áreas (redireciona) | ✅ |

## Como reproduzir

```bash
pnpm build
pnpm start        # mantenha rodando
pnpm test:rules   # em outro terminal
```

As capturas de tela das páginas podem ser geradas com `pnpm screens` (Chrome/Edge).
