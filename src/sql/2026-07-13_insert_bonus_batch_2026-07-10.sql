begin;

-- Nome incompleto no cadastro (faltava sobrenome); confirmado que o id 59
-- e o "Jose Nunes Damacena Neto" da planilha do 2 trimestre.
update public.users
set name = 'José Nunes Damacena Neto', updated_at = now()
where id = 59
  and name = 'José ';

create temp table tmp_bonus_input (
  user_id bigint not null,
  display_name text not null,
  valor_bonificacao numeric(14, 2) not null
) on commit drop;

insert into tmp_bonus_input (
  user_id,
  display_name,
  valor_bonificacao
)
values
  (1, 'Victor Eduardo', 1575.00),
  (9, 'Lucas Montenegro', 6750.00),
  (10, 'Heitor Neto', 5625.00),
  (13, 'Andrea Albuquerque', 5625.00),
  (24, 'Gabriel Chaves', 2025.00),
  (27, 'Italo Oliveira (bolsa de 1.200)', 540.00),
  (29, 'Sthephanie Vilar', 7125.00),
  (30, 'Raissa Cartaxo', 5625.00),
  (31, 'Camila Ramos (bolsa de 10.000)', 4500.00),
  (32, 'Samuel Araujo (bolsa de 1.200)', 540.00),
  (33, 'Alexandre Mariano', 3375.00),
  (34, 'Danniela da Silva Carvalho', 1125.00),
  (35, 'David Lopes', 2025.00),
  (36, 'Dayane Cavalcante', 2700.00),
  (37, 'Gabriel Matias', 540.00),
  (38, 'Gabriel Queiroz', 1350.00),
  (39, 'Isabela Vanessa', 1575.00),
  (40, 'Janailma Santos', 3375.00),
  (41, 'Laryssa Costa', 1575.00),
  (42, 'Layze Lima', 1575.00),
  (43, 'Leticia Costa (bolsa de 1.200)', 540.00),
  (44, 'Maria Clara (Mariaclara Alves)', 1450.05),
  (45, 'Tarcylla Kivia', 1125.00),
  (46, 'Tais Santino', 1125.00),
  (47, 'Yarimma Karol', 2700.00),
  (55, 'Lizandra Holanda de Araujo Sousa', 468.00),
  (56, 'Pedro Henrique Lins Queiroga de Castro', 468.00),
  (57, 'Jose Iago Feitosa Muniz', 468.00),
  (58, 'Andre Luiz de Luna Guerra', 3825.00),
  (59, 'Jose Nunes Damacena Neto', 1800.00),
  (60, 'Livia dos Santos Falcao', 2040.00),
  (61, 'Livia Maria Dantas Franca', 408.00),
  (62, 'Nathan Meira Nobrega', 138.00),
  (64, 'Maria Gabriela dos Santos Rodrigues', 330.00),
  (65, 'Marcos Andrey de Lira Albuquerque', 468.00),
  (66, 'Ana Carolina Galdino Aniceto', 468.00);

do $$
declare
  missing_users text;
begin
  select string_agg(format('%s (%s)', t.user_id, t.display_name), ', ')
    into missing_users
  from tmp_bonus_input t
  left join public.users u on u.id = t.user_id
  where u.id is null;

  if missing_users is not null then
    raise exception 'IDs nao encontrados em public.users: %', missing_users;
  end if;
end $$;

with joined_users as (
  select
    t.user_id,
    t.display_name,
    t.valor_bonificacao,
    exists (
      select 1
      from unnest(coalesce(u.innovacoin_roles, array[]::varchar[])) as role_entry(role_name)
      where lower(trim(role_entry.role_name)) = 'head'
    ) as is_head
  from tmp_bonus_input t
  inner join public.users u
    on u.id = t.user_id
)
insert into public.parcelas_bonus (
  user_id,
  valor_depositado,
  valor_caju,
  data_deposito,
  criado_em,
  atualizado_em
)
select
  j.user_id,
  j.valor_bonificacao,
  case
    when j.is_head then j.valor_bonificacao
    else 0
  end as valor_caju,
  date '2026-07-10',
  now(),
  now()
from joined_users j
where not exists (
  select 1
  from public.parcelas_bonus pb
  where pb.user_id = j.user_id
    and pb.data_deposito = date '2026-07-10'
    and pb.valor_depositado = j.valor_bonificacao
    and coalesce(pb.valor_caju, 0) = case
      when j.is_head then j.valor_bonificacao
      else 0
    end
);

commit;

-- Conferencia opcional apos a carga:
select
  pb.user_id,
  u.name,
  u.username,
  u.email,
  pb.valor_depositado,
  pb.valor_caju,
  pb.data_deposito
from public.parcelas_bonus pb
inner join public.users u on u.id = pb.user_id
where pb.data_deposito = date '2026-07-10'
  and pb.user_id in (
    1, 9, 10, 13, 24, 27, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42, 43, 44, 45, 46, 47, 55, 56, 57, 58, 59, 60, 61, 62, 64, 65, 66
  )
order by pb.user_id;
