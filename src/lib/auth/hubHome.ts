/** Home pública do Hub Innovatis — destino do "Sair" das plataformas. */
export const DEFAULT_HUB_HOME_URL = "https://hub.innovatismc.com/";

function isAllowedHttpHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function hubHomeUrl(): string {
  const raw = process.env["HUB_HOME_URL"]?.trim();
  if (!raw) {
    return DEFAULT_HUB_HOME_URL;
  }

  try {
    const url = new URL(raw);
    if (url.protocol === "https:") {
      return url.toString();
    }
    if (url.protocol === "http:" && isAllowedHttpHost(url.hostname)) {
      return url.toString();
    }
    return DEFAULT_HUB_HOME_URL;
  } catch {
    return DEFAULT_HUB_HOME_URL;
  }
}
