const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

export function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDateTimeBR(value: string) {
  return dateFormatter.format(new Date(value));
}

export function formatDateBR(value: string) {
  return shortDateFormatter.format(new Date(value));
}

function formatTimeUnit(
  value: number,
  singularLabel: string,
  pluralLabel: string,
) {
  if (value <= 0) {
    return null;
  }

  return `${value} ${value === 1 ? singularLabel : pluralLabel}`;
}

function joinFriendlyParts(parts: string[]) {
  if (parts.length === 0) {
    return "";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]} e ${parts[1]}`;
}

function getCalendarDiffParts(fromDate: Date, targetDate: Date) {
  let years = targetDate.getFullYear() - fromDate.getFullYear();
  let months = targetDate.getMonth() - fromDate.getMonth();
  let days = targetDate.getDate() - fromDate.getDate();
  let hours = targetDate.getHours() - fromDate.getHours();
  let minutes = targetDate.getMinutes() - fromDate.getMinutes();

  if (minutes < 0) {
    minutes += 60;
    hours -= 1;
  }

  if (hours < 0) {
    hours += 24;
    days -= 1;
  }

  if (days < 0) {
    const previousMonthDays = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      0,
    ).getDate();

    days += previousMonthDays;
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return { years, months, days, hours, minutes };
}

export function getRemainingTime(
  targetDate: string,
  referenceDate: Date | number = new Date(),
) {
  const now =
    referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const target = new Date(targetDate);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return "Disponível para resgate";
  }

  const { years, months, days, hours, minutes } = getCalendarDiffParts(
    now,
    target,
  );

  if (years > 0) {
    return joinFriendlyParts(
      [
        formatTimeUnit(years, "ano", "anos"),
        formatTimeUnit(months, "mês", "meses"),
      ].filter((value): value is string => Boolean(value)),
    );
  }

  if (months > 0) {
    return joinFriendlyParts(
      [
        formatTimeUnit(months, "mês", "meses"),
        formatTimeUnit(days, "dia", "dias"),
      ].filter((value): value is string => Boolean(value)),
    );
  }

  if (days > 0) {
    return joinFriendlyParts(
      [
        formatTimeUnit(days, "dia", "dias"),
        formatTimeUnit(hours, "hora", "horas"),
      ].filter((value): value is string => Boolean(value)),
    );
  }

  if (hours > 0) {
    return joinFriendlyParts(
      [
        formatTimeUnit(hours, "hora", "horas"),
        formatTimeUnit(minutes, "minuto", "minutos"),
      ].filter((value): value is string => Boolean(value)),
    );
  }

  return formatTimeUnit(Math.max(minutes, 1), "minuto", "minutos") ?? "1 minuto";
}
