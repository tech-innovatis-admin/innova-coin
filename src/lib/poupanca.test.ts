import { describe, expect, it } from "vitest";
import { calculateDepositAccruedYield } from "./poupanca";

describe("calculateDepositAccruedYield", () => {
  it("returns 0 when today is the deposit date (0 months elapsed)", () => {
    const result = calculateDepositAccruedYield(
      "2026-01-10",
      1000,
      () => 1,
      new Date("2026-01-10T00:00:00Z"),
    );
    expect(result).toBe(0);
  });

  it("returns 0 when less than one full month has elapsed", () => {
    const result = calculateDepositAccruedYield(
      "2026-01-10",
      1000,
      () => 1,
      new Date("2026-01-25T00:00:00Z"),
    );
    expect(result).toBe(0);
  });

  it("applies one month of yield using the rate keyed by the deposit date", () => {
    const getRate = (dateKey: string) => (dateKey === "2026-01-10" ? 0.6703 : undefined);
    const result = calculateDepositAccruedYield(
      "2026-01-10",
      1000,
      getRate,
      new Date("2026-02-10T00:00:00Z"),
    );
    expect(result).toBeCloseTo(6.703, 5);
  });

  it("compounds across two closed months, keying each period by the previous aniversary", () => {
    const rates: Record<string, number> = {
      "2026-01-10": 1,
      "2026-02-10": 2,
    };
    const getRate = (dateKey: string) => rates[dateKey];
    const result = calculateDepositAccruedYield(
      "2026-01-10",
      1000,
      getRate,
      new Date("2026-03-10T00:00:00Z"),
    );
    // 1000 * 1.01 * 1.02 - 1000 = 30.2
    expect(result).toBeCloseTo(30.2, 5);
  });

  it("clamps the aniversary to the last day of a shorter month (deposit on the 31st)", () => {
    const rates: Record<string, number> = {
      "2026-01-31": 1,
    };
    const getRate = (dateKey: string) => rates[dateKey];
    // 2026 is not a leap year, so the first period must close on 2026-02-28
    const result = calculateDepositAccruedYield(
      "2026-01-31",
      1000,
      getRate,
      new Date("2026-03-01T00:00:00Z"),
    );
    expect(result).toBeCloseTo(10, 5);
  });

  it("skips a period with no cached rate instead of throwing, and keeps compounding later periods", () => {
    const rates: Record<string, number> = {
      "2026-01-10": 1,
      // "2026-02-10" intentionally missing
    };
    const getRate = (dateKey: string) => rates[dateKey];
    const result = calculateDepositAccruedYield(
      "2026-01-10",
      1000,
      getRate,
      new Date("2026-03-10T00:00:00Z"),
    );
    // period 1 applies (1%), period 2 is skipped (missing rate) -> only +10
    expect(result).toBeCloseTo(10, 5);
  });
});
