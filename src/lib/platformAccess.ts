import { unauthenticatedLoginPath } from "@/lib/authMode";

export const LOGIN_PATH = "/login";
export const FIRST_ACCESS_PATH = "/primeiro-acesso";
export const ADMIN_HOME_PATH = "/admin";
export const HEAD_DASHBOARD_PATH = "/dashboard";

const INNOVACOIN_PLATFORM = "innovacoin";
const INNOVACOIN_ADMIN_ROLE = "admin";
const INNOVACOIN_HEAD_ROLE = "head";
const INNOVACOIN_COLLABORATOR_ROLE = "colaborador";

export type PlatformAccessUser = {
  id: string;
  platforms?: string[] | null;
  innovacoinRoles?: string[] | null;
  mustChangePassword?: boolean | null;
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

export function isInnovacoinCollaboratorRole(roles: string[] | null | undefined) {
  return normalizeList(roles).includes(INNOVACOIN_COLLABORATOR_ROLE);
}

export function isPlatformAdminUser(user: PlatformAccessUser) {
  return isInnovacoinAdminRole(user.innovacoinRoles);
}

export function isPlatformHeadUser(user: PlatformAccessUser) {
  return isInnovacoinHeadRole(user.innovacoinRoles);
}

export function isPlatformCollaboratorUser(user: PlatformAccessUser) {
  return isInnovacoinCollaboratorRole(user.innovacoinRoles);
}

export function isPlatformDashboardUser(user: PlatformAccessUser) {
  return isPlatformHeadUser(user) || isPlatformCollaboratorUser(user);
}

export function hasPlatformAccess(user: PlatformAccessUser) {
  return isPlatformAdminUser(user) || isPlatformDashboardUser(user);
}

export function isSafePostLoginPath(pathname: string | null | undefined) {
  return (
    pathname === FIRST_ACCESS_PATH ||
    pathname === ADMIN_HOME_PATH ||
    pathname === HEAD_DASHBOARD_PATH
  );
}

export function isPublicEntryPath(pathname: string) {
  return pathname === "/" || pathname === LOGIN_PATH;
}

export function isFirstAccessPath(pathname: string) {
  return pathname === FIRST_ACCESS_PATH;
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
  return isFirstAccessPath(pathname) || isAdminPath(pathname) || isHeadPath(pathname);
}

function getDefaultPostLoginPath(user: PlatformAccessUser) {
  if (isPlatformAdminUser(user)) {
    return ADMIN_HOME_PATH;
  }

  if (isPlatformDashboardUser(user)) {
    return HEAD_DASHBOARD_PATH;
  }

  return null;
}

export function shouldForcePasswordChange(user: PlatformAccessUser | null | undefined) {
  return user?.mustChangePassword === true;
}

export function getPostLoginPath(user: PlatformAccessUser) {
  const defaultPostLoginPath = getDefaultPostLoginPath(user);

  if (!defaultPostLoginPath) {
    return null;
  }

  if (shouldForcePasswordChange(user)) {
    return FIRST_ACCESS_PATH;
  }

  return defaultPostLoginPath;
}

export function getRedirectTargetForPathname(
  user: PlatformAccessUser | null | undefined,
  pathname: string,
) {
  if (!user) {
    return isProtectedAppPath(pathname) ? unauthenticatedLoginPath() : null;
  }

  const postLoginPath = getPostLoginPath(user);

  if (!postLoginPath) {
    return isProtectedAppPath(pathname) ? LOGIN_PATH : null;
  }

  if (shouldForcePasswordChange(user)) {
    return isFirstAccessPath(pathname) ? null : FIRST_ACCESS_PATH;
  }

  if (isPublicEntryPath(pathname)) {
    return postLoginPath;
  }

  if (isFirstAccessPath(pathname)) {
    return postLoginPath;
  }

  if (isAdminPath(pathname) && !isPlatformAdminUser(user)) {
    return isPlatformDashboardUser(user) ? HEAD_DASHBOARD_PATH : LOGIN_PATH;
  }

  if (isHeadPath(pathname)) {
    if (isPlatformDashboardUser(user)) {
      return null;
    }

    if (isPlatformAdminUser(user)) {
      return ADMIN_HOME_PATH;
    }

    return LOGIN_PATH;
  }

  return null;
}
