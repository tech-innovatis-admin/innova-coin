# Rendimento da poupança (Bacen) no dashboard InnovaCoin

## Contexto

Os bônus trimestrais (`parcelas_bonus.valor_depositado`) ficam numa conta que
rende como poupança até o resgate (5 anos para heads, fechamento do ano para
colaboradores). Hoje o dashboard mostra apenas o valor do último depósito
("Último aporte"/"Último bônus"). O objetivo desta feature é mostrar, no lugar
desse badge, quanto esse saldo já rendeu de juros de poupança até hoje,
atualizado a cada carregamento do dashboard (o que cobre o caso de uso "sempre
que o usuário fizer login").

`valor_caju` (liberado imediatamente no cartão de benefícios Caju) **não**
entra nesse cálculo — só o saldo travado (`valor_depositado` /
`pendingBalance`) rende.

## Fonte de dados: Bacen SGS série 195

Endpoint: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados?formato=json&dataInicial=DD/MM/AAAA&dataFinal=DD/MM/AAAA`
(também existe `.../dados/ultimos/N?formato=json` para os N valores mais recentes).

Formato de cada item:

```json
{ "data": "10/07/2026", "dataFim": "10/08/2026", "valor": "0.6703" }
```

- `data`: dia do "aniversário" do depósito ao qual essa taxa se aplica.
- `dataFim`: data em que o rendimento é efetivamente creditado (1 mês depois).
- `valor`: percentual (`%`) creditado em `dataFim` para depósitos cujo
  aniversário é `data`.

Não é uma série de juros compostos diários — é uma taxa por dia-de-aniversário,
uma vez por mês, igual à regra real da caderneta de poupança. Limite da API:
intervalo entre `dataInicial` e `dataFinal` não pode passar de 10 anos.

## Armazenamento local (cache das taxas)

Nova tabela (migração em `src/sql/`):

```sql
create table public.bacen_poupanca_rates (
  rate_date date primary key,
  valor numeric(10, 6) not null,
  synced_at timestamptz not null default now()
);
```

Guarda a série 195 localmente. Nunca calculamos rendimento chamando o Bacen
diretamente no caminho de renderização — sempre lemos desse cache.

## Sincronização

Função `ensurePoupancaRatesSynced()` (novo módulo `src/lib/poupanca.ts`),
chamada no carregamento do dashboard (`getDashboardUserById`, que atende tanto
`/dashboard` quanto `/admin/heads/[headId]`, já que ambos usam
`HeadDashboardPanel`):

1. Lê `max(rate_date)` em `bacen_poupanca_rates`.
2. Se o cache está vazio: busca desde a `data_deposito` mais antiga existente
   em `parcelas_bonus` até hoje.
3. Se o cache já tem dados mas não o dia mais recente publicado pelo Bacen:
   busca só o intervalo que falta (do dia seguinte ao último `rate_date`
   até hoje) e faz upsert.
4. Se já está atualizado: não chama a API do Bacen (fast path, só uma leitura
   no nosso banco).

Fetch para o Bacen usa `cache: "no-store"` (a lógica de frescor é controlada
pela nossa própria tabela, não pelo cache de fetch do Next.js).

## Cálculo do rendimento acumulado

Para cada linha de `parcelas_bonus` de um usuário (usando só
`valor_depositado`, com `data_deposito` = D e valor original = P):

1. "Aniversário" = dia do mês de D.
2. Para cada mês fechado entre D e hoje (D+1 mês, D+2 meses, ...), com o dia
   ajustado para o último dia do mês quando o aniversário não existir nesse
   mês (ex.: depósito no dia 31 credita no último dia de fevereiro):
   - busca a taxa em `bacen_poupanca_rates` cujo `rate_date` é o início
     daquele período (a primeira taxa usa `rate_date = D`; as seguintes usam
     o aniversário anterior já ajustado).
   - se a taxa não existir no cache (buraco), pula esse período (rende 0%
     nesse mês, não interrompe o cálculo).
   - saldo = saldo anterior `* (1 + taxa / 100)`.
3. Rendimento do depósito = saldo composto final − P.
4. Depósitos com menos de 1 mês corrido: rendimento = 0.

O "rendimento acumulado" do usuário = soma do rendimento de todos os seus
depósitos (`valor_depositado`).

## Integração no app

- `DashboardUser` (`src/lib/heads.ts`) ganha o campo `accruedYield: number`.
- `getDashboardUserById` chama `ensurePoupancaRatesSynced()` e depois calcula
  `accruedYield` a partir dos installments já carregados.
- `HeadDashboardPanel.tsx`: o badge que hoje mostra
  `lastContributionLabel` ("Último aporte"/"Último bônus") +
  `formatCurrencyBRL(user.lastInstallment ?? 0)` passa a mostrar um rótulo
  novo (ex.: "Rendimento acumulado") + `formatCurrencyBRL(user.accruedYield)`,
  para heads e colaboradores.

## Tratamento de erros

- Bacen indisponível durante o sync: erro é capturado e logado; o dashboard
  segue renderizando normalmente usando o que já existir no cache local.
- Cache totalmente vazio e Bacen indisponível na primeira sincronização:
  `accruedYield` fica `0` (não quebra a página).
- Taxa faltando para um período específico: esse período é pulado no
  cálculo (não interrompe o cálculo dos demais).

## Fora de escopo

- `valor_caju` não rende (liberado imediatamente).
- Não há projeção/estimativa do mês corrente — só meses já fechados contam
  (fiel à regra real da poupança).
- Não há UI nova além da troca do badge existente em `HeadDashboardPanel`.
