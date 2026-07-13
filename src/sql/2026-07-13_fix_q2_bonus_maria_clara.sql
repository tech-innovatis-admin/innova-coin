begin;

-- Valor correto do 2 trimestre confirmado pelo usuario: R$325,00 (nao mexe
-- no valor do 1 trimestre, que permanece R$1.350,00).
update public.parcelas_bonus
set valor_depositado = 325.00, atualizado_em = now()
where id = 68
  and user_id = 44
  and data_deposito = date '2026-07-10'
  and valor_depositado = 1450.05;

commit;

-- Conferencia:
select id, user_id, valor_depositado, valor_caju, data_deposito, atualizado_em
from public.parcelas_bonus
where user_id = 44
order by data_deposito;
