import { describe, expect, it } from "vitest";

import {
  CLAIM_PLATFORMS,
  CLAIM_ROLES,
  CLAIM_USER_ID,
  hasCentralPlatformAccess,
  parseCentralClaims,
} from "@/lib/auth/centralOidc";

describe("parseCentralClaims", () => {
  it("extrai identidade central e exige plataforma innovacoin", () => {
    const identity = parseCentralClaims({
      sub: "broker-sub",
      sid: "broker-sid",
      [CLAIM_USER_ID]: 7,
      [CLAIM_PLATFORMS]: ["innovacoin"],
      [CLAIM_ROLES]: ["admin"],
    });
    expect(identity.userId).toBe(7);
    expect(identity.roles).toEqual(["admin"]);
    expect(hasCentralPlatformAccess(identity)).toBe(true);
  });

  it("rejeita claims sem sub ou sid", () => {
    expect(() => parseCentralClaims({ sub: "only-sub" })).toThrow(/sub or sid/i);
  });
});
