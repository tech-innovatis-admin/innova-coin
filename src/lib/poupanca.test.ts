import { describe, expect, it } from "vitest";
import { calculateDepositAccruedYield, getMonthlyYieldBreakdown } from "./poupanca";

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

  it("always anchors the aniversary to day 10 of the deposit's month, regardless of the exact day stored", () => {
    // Every bônus in this app is deposited on the 10th of the month by
    // business rule, so the function normalizes to day 10 even if a
    // different day-of-month were ever passed in.
    const rates: Record<string, number> = {
      "2026-01-10": 1,
    };
    const getRate = (dateKey: string) => rates[dateKey];
    const result = calculateDepositAccruedYield(
      "2026-01-31",
      1000,
      getRate,
      new Date("2026-02-10T00:00:00Z"),
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

describe("getMonthlyYieldBreakdown", () => {
  it("returns an empty breakdown when there are no installments", () => {
    const result = getMonthlyYieldBreakdown(
      [],
      new Map(),
      new Date("2026-03-10T00:00:00Z"),
    );
    expect(result).toEqual([]);
  });

  it("returns an empty breakdown when no full month has elapsed yet", () => {
    const rateMap = new Map([["2026-01-10", 1]]);
    const result = getMonthlyYieldBreakdown(
      [{ accumulatedAmount: 1000, addedAt: "2026-01-10" }],
      rateMap,
      new Date("2026-01-25T00:00:00Z"),
    );
    expect(result).toEqual([]);
  });

  it("compounds a single deposit month over month (each month's amount is based on the already-grown balance)", () => {
    const rateMap = new Map([
      ["2026-01-10", 0.67],
      ["2026-02-10", 0.65],
    ]);
    const result = getMonthlyYieldBreakdown(
      [{ accumulatedAmount: 1000, addedAt: "2026-01-10" }],
      rateMap,
      new Date("2026-03-10T00:00:00Z"),
    );
    // period 1: 1000 * 0.0067 = 6.7 -> balance becomes 1006.7
    // period 2: 1006.7 * 0.0065 = 6.54355 (uses the grown balance, not the original 1000)
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      periodEndIso: "2026-02-10",
      ratePercent: 0.67,
      monthlyAmount: 6.7,
    });
    expect(result[1].periodEndIso).toBe("2026-03-10");
    expect(result[1].ratePercent).toBe(0.65);
    expect(result[1].monthlyAmount).toBeCloseTo(6.54355, 5);
  });

  it("only includes a deposit's own gain starting the month it actually existed", () => {
    // Deposit A (Jan 10, R$1000) is already accruing by Feb 10; deposit B
    // (Feb 10, R$500) only starts accruing from Mar 10 onward, so Feb 10's
    // monthlyAmount must come from A alone, not from A+B.
    const rateMap = new Map([
      ["2026-01-10", 1],
      ["2026-02-10", 2],
    ]);
    const result = getMonthlyYieldBreakdown(
      [
        { accumulatedAmount: 1000, addedAt: "2026-01-10" },
        { accumulatedAmount: 500, addedAt: "2026-02-10" },
      ],
      rateMap,
      new Date("2026-03-10T00:00:00Z"),
    );
    // period 1 (Feb 10): only A -> 1000 * 0.01 = 10; A's balance becomes 1010
    // period 2 (Mar 10): A -> 1010 * 0.02 = 20.2, B -> 500 * 0.02 = 10 -> 30.2 total
    expect(result).toEqual([
      { periodEndIso: "2026-02-10", ratePercent: 1, monthlyAmount: 10 },
      { periodEndIso: "2026-03-10", ratePercent: 2, monthlyAmount: 30.2 },
    ]);
  });

  it("skips a month with no cached rate instead of throwing, and does not grow the balance that month", () => {
    const rateMap = new Map([["2026-01-10", 1]]);
    const result = getMonthlyYieldBreakdown(
      [{ accumulatedAmount: 1000, addedAt: "2026-01-10" }],
      rateMap,
      new Date("2026-03-10T00:00:00Z"),
    );
    // "2026-02-10" has no cached rate, so no entry for it -- only period 1
    expect(result).toEqual([
      { periodEndIso: "2026-02-10", ratePercent: 1, monthlyAmount: 10 },
    ]);
  });
});
