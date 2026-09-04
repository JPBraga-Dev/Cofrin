import { describe, expect, it } from "vitest";
import { fromCents, sumInCents, toCents } from "../src/domain/money.js";

describe("money in cents", () => {
  it("normalizes decimal input at the domain boundary", () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(fromCents(sumInCents([0.1, 0.2, 10.015]))).toBe(10.32);
  });

  it("rejects non-finite and unsafe monetary values", () => {
    expect(() => toCents(Number.NaN)).toThrow("inválido");
    expect(() => toCents(Number.MAX_SAFE_INTEGER)).toThrow("limite");
  });
});
