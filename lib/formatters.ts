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

export function getRemainingTime(targetDate: string) {
  const now = new Date();
  const target = new Date(targetDate);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return "Disponível para resgate";
  }

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts = [
    days > 0 ? `${days}d` : null,
    hours > 0 ? `${hours}h` : null,
    `${minutes}min`,
  ].filter(Boolean);

  return parts.join(" ");
}
