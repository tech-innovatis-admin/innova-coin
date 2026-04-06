export const LOGIN_PATH = "/login";
export const ADMIN_HOME_PATH = "/admin";
export const HEAD_DASHBOARD_PATH = "/dashboard";

const INNOVACOIN_PLATFORM = "innovacoin";
const INNOVACOIN_ADMIN_ROLE = "admin";
const INNOVACOIN_HEAD_ROLE = "head";

export type PlatformAccessUser = {
  id: string;
  platforms?: string[] | null;
  innovacoinRoles?: string[] | null;
};

function normalizeValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeList(values: string[] | null | undefined) {
  return values
    ?.map((value) => normalizeValue(value))
    .filter(Boolean) ?? [];
}

export function hasInnovacoinPlatform(user: PlatformAccessUser) {
  return normalizeList(user.platforms).includes(INNOVACOIN_PLATFORM);
}

export function isInnovacoinAdminRole(roles: string[] | null | undefined) {
  return normalizeList(roles).includes(INNOVACOIN_ADMIN_ROLE);
}

export function isInnovacoinHeadRole(roles: string[] | null | undefined) {
  return normalizeList(roles).includes(INNOVACOIN_HEAD_ROLE);
}

export function isPlatformAdminUser(user: PlatformAccessUser) {
  return hasInnovacoinPlatform(user) && isInnovacoinAdminRole(user.innovacoinRoles);
}

export function isPlatformHeadUser(user: PlatformAccessUser) {
  return hasInnovacoinPlatform(user) && isInnovacoinHeadRole(user.innovacoinRoles);
}

export function hasPlatformAccess(user: PlatformAccessUser) {
  return Boolean(user.id?.trim());
}

export function isSafePostLoginPath(pathname: string | null | undefined) {
  return pathname === ADMIN_HOME_PATH || pathname === HEAD_DASHBOARD_PATH;
}

export function isPublicEntryPath(pathname: string) {
  return pathname === "/" || pathname === LOGIN_PATH;
}

export function isAdminPath(pathname: string) {
  return pathname === ADMIN_HOME_PATH || pathname.startsWith(`${ADMIN_HOME_PATH}/`);
}

export function isHeadPath(pathname: string) {
  return (
    pathname === HEAD_DASHBOARD_PATH ||
    pathname.startsWith(`${HEAD_DASHBOARD_PATH}/`)
  );
}

export function isProtectedAppPath(pathname: string) {
  return isAdminPath(pathname) || isHeadPath(pathname);
}

export function getPostLoginPath(user: PlatformAccessUser) {
  if (isPlatformAdminUser(user)) {
    return ADMIN_HOME_PATH;
  }

  if (hasPlatformAccess(user)) {
    return HEAD_DASHBOARD_PATH;
  }

  return null;
}

export function getRedirectTargetForPathname(
  user: PlatformAccessUser | null | undefined,
  pathname: string,
) {
  if (!user) {
    return isProtectedAppPath(pathname) ? LOGIN_PATH : null;
  }

  const postLoginPath = getPostLoginPath(user);

  if (!postLoginPath) {
    return isProtectedAppPath(pathname) ? LOGIN_PATH : null;
  }

  if (isPublicEntryPath(pathname)) {
    return postLoginPath;
  }

  if (isAdminPath(pathname) && !isPlatformAdminUser(user)) {
    return HEAD_DASHBOARD_PATH;
  }

  if (isHeadPath(pathname) && !hasPlatformAccess(user)) {
    return LOGIN_PATH;
  }

  return null;
}
