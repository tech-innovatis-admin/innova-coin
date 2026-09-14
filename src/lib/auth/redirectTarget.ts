export function safeReturnTo(raw: string | null | undefined, fallback: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }

  if (/[\u0000-\u001F\u007F]/.test(raw)) {
    return fallback;
  }

  return raw;
}
