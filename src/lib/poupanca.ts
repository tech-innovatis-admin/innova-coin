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
