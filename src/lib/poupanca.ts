import { getDbPool } from "@/lib/db";

// Todo bonus desta aplicacao e depositado no dia 10 do mes (regra do
// negocio: dia 10 do mes subsequente ao fechamento do trimestre), entao o
// aniversario da poupanca e sempre considerado como o dia 10 do mes do
// deposito, independente do dia exato gravado em data_deposito.
const POUPANCA_ANNIVERSARY_DAY = 10;

function getAnchorDate(depositDate: Date): Date {
  return new Date(
    Date.UTC(
      depositDate.getUTCFullYear(),
      depositDate.getUTCMonth(),
      POUPANCA_ANNIVERSARY_DAY,
    ),
  );
}

function addMonthsAtAnniversary(anchorDate: Date, months: number): Date {
  return new Date(
    Date.UTC(
      anchorDate.getUTCFullYear(),
      anchorDate.getUTCMonth() + months,
      POUPANCA_ANNIVERSARY_DAY,
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
  const anchorDate = getAnchorDate(depositDate);
  let balance = principal;
  let periodStart = anchorDate;
  let periodIndex = 1;

  while (true) {
    const periodEnd = addMonthsAtAnniversary(anchorDate, periodIndex);
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

const BACEN_SERIE_195_URL =
  "https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados";

const SYNC_LAG_BUFFER_DAYS = 5;

const SYNC_ATTEMPT_THROTTLE_MS = 5 * 60 * 1000;

let lastSyncAttemptAt: number | null = null;

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
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) {
    throw new Error(`Bacen respondeu ${response.status}`);
  }

  return response.json() as Promise<BacenRateItem[]>;
}

export async function ensurePoupancaRatesSynced(): Promise<void> {
  try {
    const pool = getDbPool();

    const now = Date.now();
    if (lastSyncAttemptAt !== null && now - lastSyncAttemptAt < SYNC_ATTEMPT_THROTTLE_MS) {
      return;
    }
    lastSyncAttemptAt = now;

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
      const latestCachedDate = new Date(`${latestCached}T00:00:00Z`);
      const daysSinceLatestCached = Math.floor(
        (today.getTime() - latestCachedDate.getTime()) / (24 * 60 * 60 * 1000),
      );

      if (daysSinceLatestCached <= SYNC_LAG_BUFFER_DAYS) {
        return;
      }

      startDate = new Date(latestCachedDate);
      startDate.setUTCDate(startDate.getUTCDate() + 1);
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

    if (!Array.isArray(rates) || rates.length === 0) {
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

export async function getPoupancaRatesMap(): Promise<Map<string, number>> {
  const pool = getDbPool();
  const result = await pool.query<{ rate_date: string; valor: string }>(
    `select rate_date::text as rate_date, valor from public.bacen_poupanca_rates`,
  );

  return new Map(result.rows.map((row) => [row.rate_date, Number(row.valor)]));
}

export function sumAccruedYield(
  installments: { accumulatedAmount: number; addedAt: string }[],
  rateMap: Map<string, number>,
  today: Date,
): number {
  const getRate = (dateKey: string) => rateMap.get(dateKey);

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

export async function getAccruedYieldForInstallments(
  installments: { accumulatedAmount: number; addedAt: string }[],
): Promise<number> {
  const rateMap = await getPoupancaRatesMap();
  return sumAccruedYield(installments, rateMap, new Date());
}
