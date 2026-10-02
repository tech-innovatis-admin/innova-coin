import { describe, expect, it } from "vitest";

import { safeReturnTo } from "./redirectTarget";

describe("safeReturnTo", () => {
  const fallback = "/dashboard";

  it("aceita caminhos relativos seguros", () => {
    expect(safeReturnTo("/admin", fallback)).toBe("/admin");
    expect(safeReturnTo("/admin?x=1", fallback)).toBe("/admin?x=1");
  });

  it("rejeita open redirect e URLs absolutas", () => {
    expect(safeReturnTo("/\\evil.com", fallback)).toBe(fallback);
    expect(safeReturnTo("/\\/evil.com", fallback)).toBe(fallback);
    expect(safeReturnTo("//evil.com", fallback)).toBe(fallback);
    expect(safeReturnTo("https://evil.com", fallback)).toBe(fallback);
  });
});
