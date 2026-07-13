begin;

create table if not exists public.bacen_poupanca_rates (
  rate_date date primary key,
  valor numeric(10, 6) not null,
  synced_at timestamptz not null default now()
);

comment on table public.bacen_poupanca_rates is
  'Cache local da serie 195 do SGS/Bacen (rendimento da poupanca). Uma linha por dia de aniversario, valor em percentual.';

commit;

-- Conferencia:
select count(*) as total_linhas from public.bacen_poupanca_rates;
