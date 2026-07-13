begin;

-- O script original do 1 trimestre (2026-04-09_insert_bonus_batch_2026-04-10.sql)
-- lancou R$1.350,00 para Danniela da Silva Carvalho e Tarcylla Kivia -- o mesmo
-- valor de Tais Santino/Maria Clara, copiado por engano. As duas entraram no meio
-- do trimestre e tem valor prorata diferente. Confirmado com o financeiro em
-- 2026-07-13 que o valor correto e o da coluna "VALOR BONIFICACAO" da planilha.

update public.parcelas_bonus
set valor_depositado = 975.06, atualizado_em = now()
where id = 32
  and user_id = 34
  and data_deposito = date '2026-04-10'
  and valor_depositado = 1350.00;

update public.parcelas_bonus
set valor_depositado = 1065.06, atualizado_em = now()
where id = 33
  and user_id = 45
  and data_deposito = date '2026-04-10'
  and valor_depositado = 1350.00;

commit;

-- Conferencia:
select id, user_id, valor_depositado, valor_caju, data_deposito, atualizado_em
from public.parcelas_bonus
where id in (32, 33)
order by id;
