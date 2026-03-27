import { getDbPool } from "@/lib/db";
import { readHeadOverride, readHeadOverrides, writeHeadOverride } from "@/lib/head-overrides";
import { getPlatformHeadIds, hasPlatformAccess, isPlatformHeadId } from "@/lib/platform-access";

export type WithdrawStatus = "pending" | "released";

export type InstallmentEntry = {
  id: string;
  amount: number;
  addedAt: string;
};

export type DashboardUser = {
  id: string;
  name: string;
  email: string;
  role: "user";
  photoUrl: string | null;
  pendingBalance: number;
  lastInstallment?: number;
  installments: InstallmentEntry[];
  availableAt: string;
  filledPigSegments: number;
  status: WithdrawStatus;
};

export type HeadAccount = {
  id: string;
  userId: string;
  name: string;
  email: string;
  photoUrl: string | null;
  pendingBalance: number;
  lastInstallment?: number;
  installments: InstallmentEntry[];
  availableAt: string;
  status: WithdrawStatus;
};

type UserSummaryRow = {
  id: string | number;
  email: string | null;
  role: string | null;
  username: string | null;
  name: string | null;
  photo: string | null;
  created_at: string | Date;
  pending_balance: string | number | null;
  last_installment: string | number | null;
  last_deposit_date: string | Date | null;
};

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function addYears(value: string | Date, years: number) {
  const nextDate = new Date(value);
  nextDate.setFullYear(nextDate.getFullYear() + years);
  return nextDate.toISOString();
}

function deriveAvailability(
  lastDepositDate: string | Date | null,
  createdAt: string | Date,
) {
  const availableAt = addYears(lastDepositDate ?? createdAt, 5);
  const status: WithdrawStatus =
    new Date(availableAt).getTime() <= Date.now() ? "released" : "pending";

  return { availableAt, status };
}

function getFilledPigSegments(availableAt: string) {
  const releaseDate = new Date(availableAt);
  const cycleStart = new Date(releaseDate);
  cycleStart.setFullYear(cycleStart.getFullYear() - 5);

  const totalDuration = releaseDate.getTime() - cycleStart.getTime();
  const elapsedDuration = Date.now() - cycleStart.getTime();
  const progress =
    totalDuration <= 0
      ? 1
      : Math.min(Math.max(elapsedDuration / totalDuration, 0), 1);

  return Math.floor(progress * 20);
}

function normalizeDisplayName(
  row: Pick<UserSummaryRow, "name" | "username" | "email">,
) {
  return row.name?.trim() || row.username?.trim() || row.email?.trim() || "Usuario";
}

function normalizeEmail(row: Pick<UserSummaryRow, "email" | "username">) {
  return row.email?.trim() || row.username?.trim() || "-";
}

function mapHeadSummary(row: UserSummaryRow): Omit<HeadAccount, "installments"> {
  const { availableAt, status } = deriveAvailability(
    row.last_deposit_date,
    row.created_at,
  );

  return {
    id: String(row.id),
    userId: String(row.id),
    name: normalizeDisplayName(row),
    email: normalizeEmail(row),
    photoUrl: row.photo,
    pendingBalance: Number(row.pending_balance ?? 0),
    lastInstallment:
      row.last_installment === null ? undefined : Number(row.last_installment),
    availableAt,
    status,
  };
}

function applyHeadOverride<T extends { availableAt: string; status: WithdrawStatus }>(
  item: T,
  override: { availableAt?: string; status?: WithdrawStatus } | null,
) {
  if (!override) {
    return item;
  }

  return {
    ...item,
    availableAt: override.availableAt ?? item.availableAt,
    status: override.status ?? item.status,
  };
}

export async function getHeadSummaries() {
  const headIds = getPlatformHeadIds();

  if (headIds.length === 0) {
    return [];
  }

  const pool = getDbPool();
  const overrides = await readHeadOverrides();
  const result = await pool.query<UserSummaryRow>(
    `
      select
        u.id,
        u.email,
        u.role,
        u.username,
        u.name,
        u.photo,
        u.created_at,
        coalesce(sum(pb.valor_depositado), 0) as pending_balance,
        (
          select pb_last.valor_depositado
          from public.parcelas_bonus pb_last
          where pb_last.user_id = u.id
          order by pb_last.data_deposito desc, pb_last.criado_em desc, pb_last.id desc
          limit 1
        ) as last_installment,
        max(pb.data_deposito) as last_deposit_date
      from public.users u
      left join public.parcelas_bonus pb on pb.user_id = u.id
      where u.id::text = any($1::text[])
      group by
        u.id,
        u.email,
        u.role,
        u.username,
        u.name,
        u.photo,
        u.created_at
      order by
        coalesce(
          nullif(trim(u.name), ''),
          nullif(trim(u.username), ''),
          nullif(trim(u.email), ''),
          u.id::text
        ) asc
    `,
    [headIds],
  );

  return result.rows.map((row) =>
    applyHeadOverride(
      {
        ...mapHeadSummary(row),
        installments: [],
      },
      overrides[String(row.id)] ?? null,
    ),
  );
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
        u.created_at,
        coalesce(sum(pb.valor_depositado), 0) as pending_balance,
        (
          select pb_last.valor_depositado
          from public.parcelas_bonus pb_last
          where pb_last.user_id = u.id
          order by pb_last.data_deposito desc, pb_last.criado_em desc, pb_last.id desc
          limit 1
        ) as last_installment,
        max(pb.data_deposito) as last_deposit_date
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
        u.created_at
      limit 1
    `,
    [userId],
  );

  const user = result.rows[0];

  if (!user) {
    return null;
  }

  if (!hasPlatformAccess(String(user.id))) {
    return null;
  }

  const { availableAt, status } = deriveAvailability(
    user.last_deposit_date,
    user.created_at,
  );
  const override = await readHeadOverride(String(user.id));

  const dashboardUser = {
    id: String(user.id),
    name: normalizeDisplayName(user),
    email: normalizeEmail(user),
    role: "user",
    photoUrl: user.photo,
    pendingBalance: Number(user.pending_balance ?? 0),
    lastInstallment:
      user.last_installment === null ? undefined : Number(user.last_installment),
    installments,
    availableAt,
    filledPigSegments: getFilledPigSegments(availableAt),
    status: isPlatformHeadId(String(user.id)) ? status : "released",
  } satisfies DashboardUser;

  const overriddenUser = applyHeadOverride(dashboardUser, override);

  return {
    ...overriddenUser,
    filledPigSegments: getFilledPigSegments(overriddenUser.availableAt),
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
  amount: number;
}) {
  const pool = getDbPool();

  await pool.query(
    `
      insert into public.parcelas_bonus (
        user_id,
        valor_depositado,
        data_deposito,
        criado_em,
        atualizado_em
      )
      values ($1::bigint, $2::numeric, current_date, now(), now())
    `,
    [input.userId, input.amount],
  );
}

export async function updateHeadReleaseSettings(input: {
  userId: string;
  availableAt: string;
  status: WithdrawStatus;
}) {
  await writeHeadOverride(input.userId, {
    availableAt: input.availableAt,
    status: input.status,
  });
}

export function mapInstallmentDate(value: string | Date) {
  return toIsoString(value);
}
