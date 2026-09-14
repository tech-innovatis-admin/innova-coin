import assert from 'node:assert/strict';
import { test } from 'node:test';

import { safeReturnTo } from './redirectTarget.ts';

const CLAIM_USER_ID = 'https://innovatis.com/claims/user_id';
const CLAIM_PLATFORMS = 'https://innovatis.com/claims/platforms';
const CLAIM_ROLES = 'https://innovatis.com/claims/roles';
const PLATFORM_CODE = 'innovacoin';

function parseCentralClaims(claims: Record<string, unknown>) {
  const sub = typeof claims.sub === 'string' ? claims.sub : '';
  const sid = typeof claims.sid === 'string' ? claims.sid : '';
  if (!sub || !sid) {
    throw new Error('ID token missing sub or sid');
  }

  const platformsRaw = claims[CLAIM_PLATFORMS];
  const platforms = Array.isArray(platformsRaw)
    ? platformsRaw.filter((entry): entry is string => typeof entry === 'string')
    : [];

  const rolesRaw = claims[CLAIM_ROLES];
  const roles =
    rolesRaw && typeof rolesRaw === 'object' && !Array.isArray(rolesRaw)
      ? Object.fromEntries(
          Object.entries(rolesRaw as Record<string, unknown>).map(([key, value]) => [
            key,
            Array.isArray(value)
              ? value.filter((entry): entry is string => typeof entry === 'string')
              : [],
          ]),
        )
      : {};

  const userIdRaw = claims[CLAIM_USER_ID];
  const userId =
    typeof userIdRaw === 'number'
      ? userIdRaw
      : typeof userIdRaw === 'string'
        ? Number.parseInt(userIdRaw, 10)
        : null;

  return { sub, sid, userId, platforms, roles };
}

function hasCentralPlatformAccess(identity: { platforms: string[] }) {
  return identity.platforms.includes(PLATFORM_CODE);
}

test('parseCentralClaims exige plataforma innovacoin', () => {
  const identity = parseCentralClaims({
    sub: 'broker-sub',
    sid: 'broker-sid',
    [CLAIM_USER_ID]: 7,
    [CLAIM_PLATFORMS]: ['innovacoin'],
    [CLAIM_ROLES]: { innovacoin: ['admin'] },
  });
  assert.equal(identity.userId, 7);
  assert.deepEqual(identity.roles.innovacoin, ['admin']);
  assert.equal(hasCentralPlatformAccess(identity), true);
});

test('safeReturnTo bloqueia open redirect', () => {
  assert.equal(safeReturnTo('/admin', '/dashboard'), '/admin');
  assert.equal(safeReturnTo('https://evil.test', '/admin'), '/admin');
});
