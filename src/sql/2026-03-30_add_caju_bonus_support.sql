begin;

alter table public.parcelas_bonus
  add column if not exists valor_caju numeric(14, 2) not null default 0;

comment on column public.parcelas_bonus.valor_depositado is
  'Parcela do bonus que entra no acumulado de 5 anos.';

comment on column public.parcelas_bonus.valor_caju is
  'Parcela do bonus liberada imediatamente no cartao de beneficios Caju.';

-- Se os registros antigos tambem precisarem refletir o mesmo valor no Caju,
-- remova o comentario da linha abaixo antes de executar:
-- update public.parcelas_bonus
-- set valor_caju = valor_depositado
-- where coalesce(valor_caju, 0) = 0;

commit;
