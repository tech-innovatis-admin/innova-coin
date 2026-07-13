# Rendimento da Poupança (Bacen) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Último bônus"/"Último aporte" badge in the dashboard with the total poupança-style yield already accrued on the user's locked balance (`valor_depositado`), calculated from the Bacen SGS série 195 and refreshed on every dashboard load.

**Architecture:** A new `src/lib/poupanca.ts` module holds (1) a pure, unit-tested compounding function that turns a deposit + a rate lookup into an accrued-yield number, and (2) DB/API-facing functions that keep a local cache table of Bacen rates in sync and aggregate accrued yield across a user's installments. `getDashboardUserById` (`src/lib/heads.ts`) calls into this module and exposes a new `accruedYield` field on `DashboardUser`, which `HeadDashboardPanel.tsx` renders in place of the old badge value.

**Tech Stack:** Next.js 16 (App Router, Server Components), TypeScript, `pg` (PostgreSQL), native `fetch`, Vitest (new, for the pure calculation function only).

## Global Constraints

- Only `valor_depositado` (`InstallmentEntry.accumulatedAmount`) accrues yield — `valor_caju` is never included.
- Only fully-closed monthly periods count (no partial-month estimate) — matches real poupança crediting rules.
- The app must never crash or hang if the Bacen API is unreachable or a rate is missing for some period; always degrade gracefully (skip the period / show what's cached / show 0).
- Never call the Bacen API directly from the render path without going through the local `bacen_poupanca_rates` cache table first.
- All new date handling must be UTC-safe (use `Date.UTC` / `getUTCFullYear` / `getUTCMonth` / `getUTCDate`, never local-timezone-dependent `Date` construction) — this codebase already hit one day-off-by-one bug from local-timezone date handling (see `src/lib/formatters.ts`'s `shortDateFormatter`), do not reintroduce that class of bug.
- Follow the existing dated-SQL-file convention for schema changes (`src/sql/YYYY-MM-DD_description.sql`), and do not execute any SQL against the database without explicit user confirmation first — this project's owner has an explicit rule: no DB writes without 100% certainty, confirmed one at a time.
- No test framework exists in this repo today; this plan introduces Vitest **only** for the pure calculation function in `src/lib/poupanca.ts`. Nothing else in the plan gets automated tests — verify those parts manually as described in each task.

---

### Task 1: Add Vitest for the calculation module

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `npm test` script that runs `vitest run`.

- [ ] **Step 1: Install vitest as a dev dependency**

Run: `npm install --save-dev vitest@^4.1.0`

Expected: `package.json`'s `devDependencies` gains `"vitest": "^4.1.0"` (or whatever exact version npm resolves), and `package-lock.json` is updated.

- [ ] **Step 2: Add the `test` script**

Edit `package.json`'s `"scripts"` block to add a `test` entry:

```json
  "scripts": {
    "dev": "next dev --hostname 0.0.0.0",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run"
  },
```

- [ ] **Step 3: Verify the script runs (even with no test files yet)**

Run: `npm test`
Expected: Vitest starts and reports something like "No test files found" — this confirms the runner is wired up before we write any tests. Exit code may be non-zero because there are no tests yet; that's fine at this step.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: adiciona vitest para testar o calculo de rendimento"
```

---

### Task 2: Pure compounding calculation function (TDD)

**Files:**
- Create: `src/lib/poupanca.ts`
- Test: `src/lib/poupanca.test.ts`

**Interfaces:**
- Produces: `calculateDepositAccruedYield(depositDateIso: string, principal: number, getRate: (dateKey: string) => number | undefined, today: Date): number` — exported from `src/lib/poupanca.ts`. `depositDateIso` is a `YYYY-MM-DD` (or ISO datetime, only the date part is used) string. `dateKey` passed to `getRate` is always `YYYY-MM-DD`. Returns the accrued yield in currency units (not a percentage) — `0` if less than one full month has elapsed or all looked-up rates were missing.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/poupanca.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateDepositAccruedYield } from "./poupanca";

describe("calculateDepositAccruedYield", () => {
  it("returns 0 when today is the deposit date (0 months elapsed)", () => {
    const result = calculateDepositAccruedYield(
      "2026-01-10",
      1000,
      () => 1,
      new Date("2026-01-10T00:00:00Z"),
    );
    expect(result).toBe(0);
  });

  it("returns 0 when less than one full month has elapsed", () => {
    const result = calculateDepositAccruedYield(
      "2026-01-10",
      1000,
      () => 1,
      new Date("2026-01-25T00:00:00Z"),
    );
    expect(result).toBe(0);
  });

  it("applies one month of yield using the rate keyed by the deposit date", () => {
    const getRate = (dateKey: string) => (dateKey === "2026-01-10" ? 0.6703 : undefined);
    const result = calculateDepositAccruedYield(
      "2026-01-10",
      1000,
      getRate,
      new Date("2026-02-10T00:00:00Z"),
    );
    expect(result).toBeCloseTo(6.703, 5);
  });

  it("compounds across two closed months, keying each period by the previous aniversary", () => {
    const rates: Record<string, number> = {
      "2026-01-10": 1,
      "2026-02-10": 2,
    };
    const getRate = (dateKey: string) => rates[dateKey];
    const result = calculateDepositAccruedYield(
      "2026-01-10",
      1000,
      getRate,
      new Date("2026-03-10T00:00:00Z"),
    );
    // 1000 * 1.01 * 1.02 - 1000 = 30.2
    expect(result).toBeCloseTo(30.2, 5);
  });

  it("clamps the aniversary to the last day of a shorter month (deposit on the 31st)", () => {
    const rates: Record<string, number> = {
      "2026-01-31": 1,
    };
    const getRate = (dateKey: string) => rates[dateKey];
    // 2026 is not a leap year, so the first period must close on 2026-02-28
    const result = calculateDepositAccruedYield(
      "2026-01-31",
      1000,
      getRate,
      new Date("2026-03-01T00:00:00Z"),
    );
    expect(result).toBeCloseTo(10, 5);
  });

  it("skips a period with no cached rate instead of throwing, and keeps compounding later periods", () => {
    const rates: Record<string, number> = {
      "2026-01-10": 1,
      // "2026-02-10" intentionally missing
    };
    const getRate = (dateKey: string) => rates[dateKey];
    const result = calculateDepositAccruedYield(
      "2026-01-10",
      1000,
      getRate,
      new Date("2026-03-10T00:00:00Z"),
    );
    // period 1 applies (1%), period 2 is skipped (missing rate) -> only +10
    expect(result).toBeCloseTo(10, 5);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `src/lib/poupanca.ts` does not exist yet / `calculateDepositAccruedYield` is not exported (module not found error).

- [ ] **Step 3: Implement the calculation function**

Create `src/lib/poupanca.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all 6 tests in `src/lib/poupanca.test.ts` green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/poupanca.ts src/lib/poupanca.test.ts
git commit -m "feat: adiciona calculo puro de rendimento de poupanca"
```

---

### Task 3: `bacen_poupanca_rates` cache table

**Files:**
- Create: `src/sql/2026-07-13_create_bacen_poupanca_rates.sql`

**Interfaces:**
- Produces: table `public.bacen_poupanca_rates (rate_date date primary key, valor numeric(10,6) not null, synced_at timestamptz not null default now())`, consumed by Task 4.

- [ ] **Step 1: Write the migration file**

Create `src/sql/2026-07-13_create_bacen_poupanca_rates.sql`:

```sql
begin;

create table if not exists public.bacen_poupanca_rates (
  rate_date date primary key,
  valor numeric(10, 6) not null,
  synced_at timestamptz not null default now()
);

comment on table public.bacen_poupanca_rates is
  'Cache local da serie 195 do SGS/Bacen (rendimento da poupanca). Uma linha por dia de aniversario, valor em percentual.';

commit;

-- Conferencia:
select count(*) as total_linhas from public.bacen_poupanca_rates;
```

- [ ] **Step 2: Ask the user for explicit confirmation, then run it against the database**

This creates a new table — low risk (fully reversible with `drop table`), but per this project's rule, confirm with the user before running any statement against the real database. Once confirmed, execute the transactional part (everything up to and including `commit;`) the same way previous migrations in this session were run: a short Node script using `pg` and the credentials in `.env` (mirroring `src/lib/db.ts`'s connection logic), executed with `NODE_PATH` pointed at the project's `node_modules` so the `pg` package resolves.

Expected: the confirmation query returns `total_linhas = 0` (table exists and is empty).

- [ ] **Step 3: Commit the migration file**

```bash
git add src/sql/2026-07-13_create_bacen_poupanca_rates.sql
git commit -m "feat: cria tabela de cache das taxas de poupanca do Bacen"
```

---

### Task 4: Sync + aggregation functions

**Files:**
- Modify: `src/lib/poupanca.ts`

**Interfaces:**
- Consumes: `getDbPool()` from `src/lib/db.ts` (`import { getDbPool } from "@/lib/db";`); table `public.bacen_poupanca_rates` and `public.parcelas_bonus` from Task 3 / existing schema.
- Produces:
  - `ensurePoupancaRatesSynced(): Promise<void>` — checks the local cache freshness and fetches only the missing range from Bacen if needed; swallows and logs any error (never throws).
  - `getAccruedYieldForInstallments(installments: { accumulatedAmount: number; addedAt: string }[]): Promise<number>` — reads the local cache and sums `calculateDepositAccruedYield(...)` (from Task 2) across all given installments. This is the shape of `InstallmentEntry` already defined in `src/lib/heads.ts:11-16`, so no new type is introduced — Task 5 passes `DashboardUser["installments"]` directly.

- [ ] **Step 1: Add the Bacen fetch + sync logic to `src/lib/poupanca.ts`**

Append to `src/lib/poupanca.ts` (after the existing `calculateDepositAccruedYield` and its private helpers):

```ts
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
```

- [ ] **Step 2: Manually verify against the real database**

There is no automated test for this step (per the project's current no-test-framework convention for anything beyond the pure calculation). Verify manually:

1. Confirm `npm run lint` passes on the modified file: `npx eslint src/lib/poupanca.ts`. Expected: no output (no errors).
2. Write a small throwaway script (not committed) that calls `ensurePoupancaRatesSynced()` then queries `select count(*) from public.bacen_poupanca_rates` — expected count > 0 after the first run, matching the number of days between the earliest `data_deposito` and today.
3. Run it again — expected: the second run makes no Bacen API call (fast) and the row count stays the same (or grows by at most a few days if time passed between runs).

- [ ] **Step 3: Commit**

```bash
git add src/lib/poupanca.ts
git commit -m "feat: sincroniza taxas do Bacen e calcula rendimento acumulado"
```

---

### Task 5: Wire `accruedYield` into `DashboardUser`

**Files:**
- Modify: `src/lib/heads.ts:18-33` (the `DashboardUser` type), `src/lib/heads.ts:234-327` (`getDashboardUserById`)

**Interfaces:**
- Consumes: `ensurePoupancaRatesSynced`, `getAccruedYieldForInstallments` from `src/lib/poupanca.ts` (Task 4).
- Produces: `DashboardUser.accruedYield: number` (always a plain number, never `undefined`), read by Task 6.

- [ ] **Step 1: Add the field to the `DashboardUser` type**

In `src/lib/heads.ts`, the `DashboardUser` type (currently lines 18-33) gains one field. Change:

```ts
export type DashboardUser = {
  id: string;
  name: string;
  email: string;
  userType: InnovaUserType;
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
```

to:

```ts
export type DashboardUser = {
  id: string;
  name: string;
  email: string;
  userType: InnovaUserType;
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
  accruedYield: number;
};
```

- [ ] **Step 2: Add the import**

At the top of `src/lib/heads.ts` (currently lines 1-2):

```ts
import { getDbPool } from "@/lib/db";
import { getRemainingTime } from "@/lib/formatters";
```

Add a third import line:

```ts
import { getDbPool } from "@/lib/db";
import { getRemainingTime } from "@/lib/formatters";
import {
  ensurePoupancaRatesSynced,
  getAccruedYieldForInstallments,
} from "@/lib/poupanca";
```

- [ ] **Step 3: Compute and return `accruedYield` in `getDashboardUserById`**

In `src/lib/heads.ts`, `getDashboardUserById` currently ends with (lines 302-327):

```ts
  const { availableAt, remainingTimeLabel, status } = deriveAvailability(
    user.first_deposit_date,
    userType,
  );

  return {
    id: String(user.id),
    name: normalizeDisplayName(user),
    email: normalizeEmail(user),
    userType,
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
    filledPigSegments: getFilledPigSegments(installmentCount, userType),
    status,
  } satisfies DashboardUser;
}
```

Change it to:

```ts
  const { availableAt, remainingTimeLabel, status } = deriveAvailability(
    user.first_deposit_date,
    userType,
  );

  await ensurePoupancaRatesSynced();
  const accruedYield = await getAccruedYieldForInstallments(installments);

  return {
    id: String(user.id),
    name: normalizeDisplayName(user),
    email: normalizeEmail(user),
    userType,
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
    filledPigSegments: getFilledPigSegments(installmentCount, userType),
    status,
    accruedYield,
  } satisfies DashboardUser;
}
```

- [ ] **Step 4: Verify the project still type-checks and lints**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint src/lib/heads.ts`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/lib/heads.ts
git commit -m "feat: expoe accruedYield em DashboardUser"
```

---

### Task 6: Show accrued yield in the dashboard badge

**Files:**
- Modify: `src/components/dashboard/HeadDashboardPanel.tsx:189`, `src/components/dashboard/HeadDashboardPanel.tsx:232-240`

**Interfaces:**
- Consumes: `DashboardUser.accruedYield` (Task 5).

- [ ] **Step 1: Replace the label**

In `src/components/dashboard/HeadDashboardPanel.tsx`, line 189 currently reads:

```ts
  const lastContributionLabel = isHead ? "Último aporte" : "Último bônus";
```

Change to:

```ts
  const lastContributionLabel = "Rendimento acumulado";
```

(`isHead` stays in use elsewhere in the component — do not remove its declaration.)

- [ ] **Step 2: Replace the displayed value**

Lines 232-240 currently read:

```tsx
              {hasInstallments ? (
                <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/[0.95] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800 shadow-[0_16px_34px_rgba(16,185,129,0.14)] sm:text-[11px]">
                  <span className="block text-[9px] font-semibold tracking-[0.16em] text-emerald-700/80 sm:text-[10px]">
                    {lastContributionLabel}
                  </span>
                  <span className="mt-1 block text-sm tracking-normal text-emerald-900 sm:text-base">
                    + {formatCurrencyBRL(user.lastInstallment ?? 0)}
                  </span>
                </div>
              ) : (
```

Change the inner value line to:

```tsx
              {hasInstallments ? (
                <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/[0.95] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800 shadow-[0_16px_34px_rgba(16,185,129,0.14)] sm:text-[11px]">
                  <span className="block text-[9px] font-semibold tracking-[0.16em] text-emerald-700/80 sm:text-[10px]">
                    {lastContributionLabel}
                  </span>
                  <span className="mt-1 block text-sm tracking-normal text-emerald-900 sm:text-base">
                    + {formatCurrencyBRL(user.accruedYield)}
                  </span>
                </div>
              ) : (
```

- [ ] **Step 3: Lint the file**

Run: `npx eslint src/components/dashboard/HeadDashboardPanel.tsx`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/HeadDashboardPanel.tsx
git commit -m "feat: mostra rendimento acumulado no lugar do ultimo bonus"
```

---

### Task 7: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS (all `src/lib/poupanca.test.ts` tests green).

- [ ] **Step 2: Type-check and lint the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Start the dev server and check the dashboard**

Run: `npm run dev`

Log in as a head user with at least one installment older than 1 month (e.g. `lucas.montenegro`, deposited 2026-04-10, which by any date after 2026-05-10 has at least one closed period). Open `/dashboard`.

Expected: the badge that used to say "Último aporte: + R$X" now says "Rendimento acumulado: + R$Y" where `Y` is a small positive number (not the raw deposit amount, not R$0,00 given enough time has passed since 2026-04-10).

- [ ] **Step 4: Check a brand-new deposit shows R$0,00**

As an admin, view a head whose only installment is from the current month (less than 1 month old) via `/admin/heads/[headId]`, or temporarily check a user whose most recent deposit is this month.

Expected: "Rendimento acumulado: + R$0,00" — no crash, no `undefined`.

- [ ] **Step 5: Report results to the user**

Summarize what was checked and any discrepancy found, before considering the feature done.
