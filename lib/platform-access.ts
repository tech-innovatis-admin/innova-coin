const DEFAULT_APP_HEADS_ADMIN_IDS = ["24", "1", "6", "26", "8"];
const DEFAULT_APP_HEADS_HEAD_IDS = ["9", "10", "13", "26", "24"];

function parseIdList(value: string | undefined, fallback: string[]) {
  if (!value) {
    return new Set(fallback);
  }

  return new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

const APP_HEADS_ADMIN_IDS = parseIdList(
  process.env.APP_HEADS_ADMIN_IDS,
  DEFAULT_APP_HEADS_ADMIN_IDS,
);
const APP_HEADS_HEAD_IDS = parseIdList(
  process.env.APP_HEADS_HEAD_IDS,
  DEFAULT_APP_HEADS_HEAD_IDS,
);

export function isPlatformAdminId(userId: string) {
  return APP_HEADS_ADMIN_IDS.has(userId);
}

export function isPlatformHeadId(userId: string) {
  return APP_HEADS_HEAD_IDS.has(userId);
}

export function hasPlatformAccess(userId: string) {
  return isPlatformAdminId(userId) || isPlatformHeadId(userId);
}

export function getPostLoginPath(userId: string) {
  if (isPlatformAdminId(userId)) {
    return "/admin";
  }

  if (isPlatformHeadId(userId)) {
    return "/dashboard";
  }

  return null;
}

export function getPlatformHeadIds() {
  return [...APP_HEADS_HEAD_IDS];
}
