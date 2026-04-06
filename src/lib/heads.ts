import { getDbPool } from "@/lib/db";
import { getRemainingTime } from "@/lib/formatters";

export type WithdrawStatus = "awaiting_deposit" | "pending" | "released";

export type InstallmentEntry = {
  id: string;
  accumulatedAmount: number;
  cajuAmount: number;
  addedAt: string;
};

export type DashboardUser = {
  id: string;
  name: string;
  email: string;
  role: "user";
  photoUrl: string | null;
  pendingBalance: number;
  cajuBalance: number;
  lastInstallment?: number;
  lastCajuInstallment?: number;
  installments: InstallmentEntry[];
  availableAt: string | null;
  remainingTimeLabel: string;
  filledPigSegments: number;
  status: WithdrawStatus;
};

export type HeadAccount = {
  id: string;
  userId: string;
  name: string;
  email: string;
  isHead: boolean;
  photoUrl: string | null;
  pendingBalance: number;
  cajuBalance: number;
  lastInstallment?: number;
  lastCajuInstallment?: number;
  installments: InstallmentEntry[];
  availableAt: string | null;
  remainingTimeLabel: string;
  status: WithdrawStatus;
};

type UserSummaryRow = {
  id: string | number;
  email: string | null;
  role: string | null;
  username: string | null;
  name: string | null;
  photo: string | null;
  platforms: string[] | null;
  innovacoin_roles: string[] | null;
  pending_balance: string | number | null;
  caju_balance: string | number | null;
  last_installment: string | number | null;
  last_caju_installment: string | number | null;
  first_deposit_date: string | Date | null;
  installment_count: string | number | null;
};

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function addYears(value: string | Date, years: number) {
  const nextDate = new Date(value);
  nextDate.setFullYear(nextDate.getFullYear() + years);
  return nextDate.toISOString();
}

function deriveAvailability(firstDepositDate: string | Date | null) {
  if (!firstDepositDate) {
    return {
      availableAt: null,
      remainingTimeLabel: "Aguardando primeira parcela",
      status: "awaiting_deposit" as const,
    };
  }

  const referenceTime = Date.now();
  const availableAt = addYears(firstDepositDate, 5);
  const status: WithdrawStatus =
    new Date(availableAt).getTime() <= referenceTime ? "released" : "pending";
  const remainingTimeLabel = getRemainingTime(availableAt, referenceTime);

  return { availableAt, remainingTimeLabel, status };
}

function getFilledPigSegments(installmentCount: number) {
  return Math.min(Math.max(installmentCount, 0), 20);
}

function normalizeDisplayName(
  row: Pick<UserSummaryRow, "name" | "username" | "email">,
) {
  return row.name?.trim() || row.username?.trim() || row.email?.trim() || "Usuário";
}

function normalizeEmail(row: Pick<UserSummaryRow, "email" | "username">) {
  return row.email?.trim() || row.username?.trim() || "-";
}

function mapHeadSummary(row: UserSummaryRow): Omit<HeadAccount, "installments"> {
  const { availableAt, remainingTimeLabel, status } = deriveAvailability(
    row.first_deposit_date,
  );
  const normalizedRoles =
    row.innovacoin_roles?.map((role) => role.trim().toLowerCase()).filter(Boolean) ?? [];

  return {
    id: String(row.id),
    userId: String(row.id),
    name: normalizeDisplayName(row),
    email: normalizeEmail(row),
    isHead: normalizedRoles.includes("head"),
    photoUrl: row.photo,
    pendingBalance: Number(row.pending_balance ?? 0),
    cajuBalance: Number(row.caju_balance ?? 0),
    lastInstallment:
      row.last_installment === null ? undefined : Number(row.last_installment),
    lastCajuInstallment:
      row.last_caju_installment === null
        ? undefined
        : Number(row.last_caju_installment),
    availableAt,
    remainingTimeLabel,
    status,
  };
}

export async function getHeadSummaries() {
  const pool = getDbPool();
  const result = await pool.query<UserSummaryRow>(
    `
      select
        u.id,
        u.email,
        u.role,
        u.username,
        u.name,
        u.photo,
        coalesce(u.platforms, array[]::varchar[]) as platforms,
        coalesce(u.innovacoin_roles, array[]::varchar[]) as innovacoin_roles,
        coalesce(sum(pb.valor_depositado), 0) as pending_balance,
        coalesce(sum(pb.valor_caju), 0) as caju_balance,
        (
          select pb_last.valor_depositado
          from public.parcelas_bonus pb_last
          where
            pb_last.user_id = u.id
            and coalesce(pb_last.valor_depositado, 0) > 0
          order by pb_last.data_deposito desc, pb_last.criado_em desc, pb_last.id desc
          limit 1
        ) as last_installment,
        (
          select pb_last.valor_caju
          from public.parcelas_bonus pb_last
          where
            pb_last.user_id = u.id
            and coalesce(pb_last.valor_caju, 0) > 0
          order by pb_last.data_deposito desc, pb_last.criado_em desc, pb_last.id desc
          limit 1
        ) as last_caju_installment,
        min(pb.data_deposito) filter (where coalesce(pb.valor_depositado, 0) > 0) as first_deposit_date,
        count(pb.id) filter (where coalesce(pb.valor_depositado, 0) > 0) as installment_count
      from public.users u
      left join public.parcelas_bonus pb on pb.user_id = u.id
      group by
        u.id,
        u.email,
        u.role,
        u.username,
        u.name,
        u.photo,
        u.platforms,
        u.innovacoin_roles
      order by
        coalesce(
          nullif(trim(u.name), ''),
          nullif(trim(u.username), ''),
          nullif(trim(u.email), ''),
          u.id::text
        ) asc
    `,
  );

  return result.rows.map((row) => ({
    ...mapHeadSummary(row),
    installments: [],
  }));
}

export async function getDashboardUserById(
  userId: string,
  installments: InstallmentEntry[],
) {
  const pool = getDbPool();
  const result = await pool.query<UserSummaryRow>(
    `
      select
        u.id,
        u.email,
        u.role,
        u.username,
        u.name,
        u.photo,
        coalesce(u.platforms, array[]::varchar[]) as platforms,
        coalesce(u.innovacoin_roles, array[]::varchar[]) as innovacoin_roles,
        coalesce(sum(pb.valor_depositado), 0) as pending_balance,
        coalesce(sum(pb.valor_caju), 0) as caju_balance,
        (
          select pb_last.valor_depositado
          from public.parcelas_bonus pb_last
          where
            pb_last.user_id = u.id
            and coalesce(pb_last.valor_depositado, 0) > 0
          order by pb_last.data_deposito desc, pb_last.criado_em desc, pb_last.id desc
          limit 1
        ) as last_installment,
        (
          select pb_last.valor_caju
          from public.parcelas_bonus pb_last
          where
            pb_last.user_id = u.id
            and coalesce(pb_last.valor_caju, 0) > 0
          order by pb_last.data_deposito desc, pb_last.criado_em desc, pb_last.id desc
          limit 1
        ) as last_caju_installment,
        min(pb.data_deposito) filter (where coalesce(pb.valor_depositado, 0) > 0) as first_deposit_date,
        count(pb.id) filter (where coalesce(pb.valor_depositado, 0) > 0) as installment_count
      from public.users u
      left join public.parcelas_bonus pb on pb.user_id = u.id
      where u.id = $1::bigint
      group by
        u.id,
        u.email,
        u.role,
        u.username,
        u.name,
        u.photo,
        u.platforms,
        u.innovacoin_roles
      limit 1
    `,
    [userId],
  );

  const user = result.rows[0];

  if (!user) {
    return null;
  }

  const { availableAt, remainingTimeLabel, status } = deriveAvailability(
    user.first_deposit_date,
  );
  const installmentCount = Number(user.installment_count ?? 0);

  return {
    id: String(user.id),
    name: normalizeDisplayName(user),
    email: normalizeEmail(user),
    role: "user",
    photoUrl: user.photo,
    pendingBalance: Number(user.pending_balance ?? 0),
    cajuBalance: Number(user.caju_balance ?? 0),
    lastInstallment:
      user.last_installment === null ? undefined : Number(user.last_installment),
    lastCajuInstallment:
      user.last_caju_installment === null
        ? undefined
        : Number(user.last_caju_installment),
    installments,
    availableAt,
    remainingTimeLabel,
    filledPigSegments: getFilledPigSegments(installmentCount),
    status,
  } satisfies DashboardUser;
}

export async function updateHeadProfile(input: {
  userId: string;
  name: string;
  email: string;
  photoUrl: string | null;
}) {
  const pool = getDbPool();

  await pool.query(
    `
      update public.users
      set
        name = $2,
        email = nullif($3, ''),
        photo = $4,
        updated_at = now()
      where id = $1::bigint
    `,
    [input.userId, input.name, input.email.trim(), input.photoUrl],
  );
}

export async function addInstallmentToHead(input: {
  userId: string;
  accumulatedAmount: number;
  cajuAmount: number;
  depositDate: string;
}) {
  const pool = getDbPool();

  await pool.query(
    `
      insert into public.parcelas_bonus (
        user_id,
        valor_depositado,
        valor_caju,
        data_deposito,
        criado_em,
        atualizado_em
      )
      values ($1::bigint, $2::numeric, $3::numeric, $4::date, now(), now())
    `,
    [input.userId, input.accumulatedAmount, input.cajuAmount, input.depositDate],
  );
}

export function mapInstallmentDate(value: string | Date) {
  return toIsoString(value);
}
