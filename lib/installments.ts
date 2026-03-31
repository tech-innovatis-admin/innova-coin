import { getDbPool } from "@/lib/db";
import { mapInstallmentDate, type InstallmentEntry } from "@/lib/heads";

type InstallmentRow = {
  id: string | number;
  user_id: string | number;
  valor_depositado: string | number;
  valor_caju: string | number | null;
  data_deposito: string | Date;
  criado_em: string | Date | null;
};

export async function getInstallmentsByUserEmail(email: string) {
  const pool = getDbPool();
  const result = await pool.query<InstallmentRow>(
    `
      select
        pb.id,
        pb.user_id,
        pb.valor_depositado,
        pb.valor_caju,
        pb.data_deposito,
        pb.criado_em
      from public.parcelas_bonus pb
      inner join public.users u on u.id = pb.user_id
      where lower(u.email) = lower($1)
      order by pb.data_deposito desc, pb.criado_em desc nulls last, pb.id desc
    `,
    [email],
  );

  return result.rows;
}

export async function getInstallmentsByUserId(userId: string) {
  const pool = getDbPool();
  const result = await pool.query<InstallmentRow>(
    `
      select
        pb.id,
        pb.user_id,
        pb.valor_depositado,
        pb.valor_caju,
        pb.data_deposito,
        pb.criado_em
      from public.parcelas_bonus pb
      where pb.user_id = $1::bigint
      order by pb.data_deposito desc, pb.criado_em desc nulls last, pb.id desc
    `,
    [userId],
  );

  return result.rows;
}

export async function updateInstallmentById(input: {
  installmentId: string;
  accumulatedAmount: number;
  cajuAmount: number;
  depositDate: string;
}) {
  const pool = getDbPool();

  await pool.query(
    `
      update public.parcelas_bonus
      set
        valor_depositado = $2::numeric,
        valor_caju = $3::numeric,
        data_deposito = $4::date,
        atualizado_em = now()
      where id = $1::bigint
    `,
    [
      input.installmentId,
      input.accumulatedAmount,
      input.cajuAmount,
      input.depositDate,
    ],
  );
}

export async function deleteInstallmentById(installmentId: string) {
  const pool = getDbPool();

  await pool.query(
    `
      delete from public.parcelas_bonus
      where id = $1::bigint
    `,
    [installmentId],
  );
}

export function mapInstallments(rows: InstallmentRow[]): InstallmentEntry[] {
  return rows.map((row) => ({
    id: String(row.id),
    accumulatedAmount: Number(row.valor_depositado ?? 0),
    cajuAmount: Number(row.valor_caju ?? 0),
    addedAt: mapInstallmentDate(row.data_deposito),
  }));
}
