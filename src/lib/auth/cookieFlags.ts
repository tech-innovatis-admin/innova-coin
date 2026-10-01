/** Regra única da flag `Secure` para todos os cookies de autenticação. */
function isLocalHost(host: string) {
  const trimmedHost = host.trim().toLowerCase();
  const hostname = trimmedHost.startsWith("[")
    ? trimmedHost.slice(1, Math.max(trimmedHost.indexOf("]"), 1))
    : trimmedHost.split(":")[0] ?? "";

  if (!hostname) {
    return false;
  }

  if (hostname === "localhost" || hostname === "::1" || hostname.endsWith(".local")) {
    return true;
  }

  return (
    hostname === "0.0.0.0" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

export function resolveCookieSecure(headers: Headers): boolean {
  const configuredValue = process.env["AUTH_COOKIE_SECURE"]?.trim().toLowerCase();

  if (configuredValue === "true") {
    return true;
  }

  if (configuredValue === "false") {
    return false;
  }

  const forwardedProto = headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const host = headers.get("x-forwarded-host")?.trim() || headers.get("host")?.trim() || "";

  if (forwardedProto) {
    return forwardedProto === "https";
  }

  return process.env.NODE_ENV === "production" && host !== "" && !isLocalHost(host);
}
