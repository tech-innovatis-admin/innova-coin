import { getDbPool } from "@/lib/db";
import type { InstallmentEntry } from "@/lib/mock-data";

type InstallmentRow = {
  id: string | number;
  user_id: string | number;
  valor_depositado: string | number;
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

export function mapInstallments(rows: InstallmentRow[]): InstallmentEntry[] {
  return rows.map((row) => ({
    id: String(row.id),
    amount: Number(row.valor_depositado),
    addedAt:
      row.data_deposito instanceof Date
        ? row.data_deposito.toISOString()
        : new Date(row.data_deposito).toISOString(),
  }));
}
