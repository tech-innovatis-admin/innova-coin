export function safeReturnTo(raw: string | null | undefined, fallback: string): string {
  if (!raw || !raw.startsWith("/")) {
    return fallback;
  }

  if (raw.startsWith("//") || raw[1] === "/" || raw[1] === "\\") {
    return fallback;
  }

  if (raw.includes("\\") || /[\u0000-\u001F\u007F]/.test(raw)) {
    return fallback;
  }

  return raw;
}

