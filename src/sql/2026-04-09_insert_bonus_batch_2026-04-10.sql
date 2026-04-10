begin;

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
  (33, 'Alexandre Mariano', 4050.00),
  (30, 'Raissa Cartaxo', 5625.00),
  (46, 'Tais Santino', 1350.00),
  (29, 'Sthephanie Vilar', 7125.00),
  (36, 'Dayane Cavalcante', 2970.00),
  (41, 'Laryssa Costa', 1710.00),
  (43, 'Leticia Costa (bolsa de 1.200)', 216.00),
  (9, 'Lucas Montenegro', 6750.00),
  (44, 'Maria Clara', 1350.00),
  (37, 'Gabriel Matias', 648.00),
  (39, 'Isabela Vanessa', 1890.00),
  (42, 'Layze Lima', 1728.00),
  (40, 'Janailma Santos', 3780.00),
  (48, 'Erlon Gabriel', 648.00),
  (34, 'Danniela Carvalho', 1350.00),
  (45, 'Tarcylla Kivia', 1350.00),
  (14, 'Larice Ferreira', 2430.00),
  (13, 'Andrea Albuquerque', 5625.00),
  (2, 'Erlon Reydne', 1710.00),
  (27, 'Italo Oliveira (bolsa de 1.200)', 216.00),
  (35, 'David Lopes', 2430.00),
  (38, 'Gabriel Queiroz', 1620.00),
  (10, 'Heitor Neto', 5625.00),
  (1, 'Victor Eduardo', 1620.00),
  (24, 'Gabriel Chaves', 1890.00),
  (32, 'Samuel Araujo (bolsa de 1.200)', 108.00),
  (47, 'Yarimma Karol', 3060.00),
  (31, 'Camila Ramos (bolsa de 10.000)', 522.54);

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
  date '2026-04-10',
  now(),
  now()
from joined_users j
where not exists (
  select 1
  from public.parcelas_bonus pb
  where pb.user_id = j.user_id
    and pb.data_deposito = date '2026-04-10'
    and pb.valor_depositado = j.valor_bonificacao
    and coalesce(pb.valor_caju, 0) = case
      when j.is_head then j.valor_bonificacao
      else 0
    end
);

commit;

Conferencia opcional apos a carga:
select
  pb.user_id,
  u.username,
  u.email,
  pb.valor_depositado,
  pb.valor_caju,
  pb.data_deposito
from public.parcelas_bonus pb
inner join public.users u on u.id = pb.user_id
where pb.data_deposito = date '2026-04-10'
  and pb.user_id in (
    33, 30, 46, 29, 36, 41, 43, 9, 44, 37, 39, 42, 40, 48,
    34, 45, 14, 13, 2, 27, 35, 38, 10, 1, 24, 32, 47, 31
  )
order by pb.user_id;
