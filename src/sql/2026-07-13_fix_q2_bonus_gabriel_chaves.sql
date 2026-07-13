begin;

-- O valor calculado pela planilha para Gabriel Chaves (2025.00) estava errado;
-- valor correto confirmado pelo usuario: R$2.250,00.
update public.parcelas_bonus
set valor_depositado = 2250.00, atualizado_em = now()
where id = 51
  and user_id = 24
  and data_deposito = date '2026-07-10'
  and valor_depositado = 2025.00;

commit;

-- Conferencia:
select id, user_id, valor_depositado, valor_caju, data_deposito, atualizado_em
from public.parcelas_bonus
where id = 51;
