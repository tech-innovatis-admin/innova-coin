function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getUTCDate();
  const firstOfTargetMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
  const daysInTargetMonth = new Date(
    Date.UTC(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();
  const clampedDay = Math.min(day, daysInTargetMonth);
  return new Date(
    Date.UTC(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth(),
      clampedDay,
    ),
  );
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function calculateDepositAccruedYield(
  depositDateIso: string,
  principal: number,
  getRate: (dateKey: string) => number | undefined,
  today: Date,
): number {
  const depositDate = new Date(`${depositDateIso.slice(0, 10)}T00:00:00Z`);
  let balance = principal;
  let periodStart = depositDate;
  let periodIndex = 1;

  while (true) {
    const periodEnd = addMonthsClamped(depositDate, periodIndex);
    if (periodEnd.getTime() > today.getTime()) {
      break;
    }

    const rate = getRate(toDateKey(periodStart));
    if (rate !== undefined) {
      balance *= 1 + rate / 100;
    }

    periodStart = periodEnd;
    periodIndex += 1;
  }

  return balance - principal;
}

import { getDbPool } from "@/lib/db";

const BACEN_SERIE_195_URL =
  "https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados";

type BacenRateItem = {
  data: string;
  dataFim: string;
  valor: string;
};

function parseBrDateToIso(value: string): string {
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
}

function formatDateAsBr(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

async function fetchBacenRates(
  startDate: Date,
  endDate: Date,
): Promise<BacenRateItem[]> {
  const url = `${BACEN_SERIE_195_URL}?formato=json&dataInicial=${formatDateAsBr(
    startDate,
  )}&dataFinal=${formatDateAsBr(endDate)}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Bacen respondeu ${response.status}`);
  }

  return response.json() as Promise<BacenRateItem[]>;
}

export async function ensurePoupancaRatesSynced(): Promise<void> {
  const pool = getDbPool();

  try {
    const maxResult = await pool.query<{ max: string | null }>(
      `select max(rate_date)::text as max from public.bacen_poupanca_rates`,
    );
    const latestCached = maxResult.rows[0]?.max ?? null;
    const today = new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate(),
      ),
    );

    let startDate: Date;

    if (latestCached) {
      startDate = new Date(`${latestCached}T00:00:00Z`);
      startDate.setUTCDate(startDate.getUTCDate() + 1);

      if (startDate.getTime() > today.getTime()) {
        return;
      }
    } else {
      const earliestResult = await pool.query<{ min: string | null }>(
        `select min(data_deposito)::text as min from public.parcelas_bonus`,
      );
      const earliest = earliestResult.rows[0]?.min;

      if (!earliest) {
        return;
      }

      startDate = new Date(`${earliest}T00:00:00Z`);
    }

    const rates = await fetchBacenRates(startDate, today);

    if (rates.length === 0) {
      return;
    }

    const valuePlaceholders = rates
      .map((_, index) => `($${index * 2 + 1}::date, $${index * 2 + 2}::numeric)`)
      .join(", ");
    const params = rates.flatMap((item) => [
      parseBrDateToIso(item.data),
      item.valor,
    ]);

    await pool.query(
      `insert into public.bacen_poupanca_rates (rate_date, valor)
       values ${valuePlaceholders}
       on conflict (rate_date) do update set valor = excluded.valor, synced_at = now()`,
      params,
    );
  } catch (error) {
    console.error("[poupanca] falha ao sincronizar taxas do Bacen:", error);
  }
}

export async function getAccruedYieldForInstallments(
  installments: { accumulatedAmount: number; addedAt: string }[],
): Promise<number> {
  const pool = getDbPool();
  const result = await pool.query<{ rate_date: string; valor: string }>(
    `select rate_date::text as rate_date, valor from public.bacen_poupanca_rates`,
  );
  const rateByDate = new Map(
    result.rows.map((row) => [row.rate_date, Number(row.valor)]),
  );
  const getRate = (dateKey: string) => rateByDate.get(dateKey);
  const today = new Date();

  return installments.reduce(
    (total, installment) =>
      total +
      calculateDepositAccruedYield(
        installment.addedAt,
        installment.accumulatedAmount,
        getRate,
        today,
      ),
    0,
  );
}
