import { describe, expect, it } from "vitest";
import { budgetSpent } from "../../frontend/src/utils/selectors.js";
import type { Budget, Transaction } from "../../frontend/src/types/index.js";
import { SEED_USER_IDS } from "../src/data/seedIds.js";

const budget: Budget = {
  id: "budget-leisure", userId: SEED_USER_IDS.joao, categoryId: "leisure", limitAmount: 500,
  currentAmount: 0, period: "MONTHLY", referenceMonth: "2026-09",
  createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
};
const expense = (amount: number, categoryId = "leisure"): Transaction => ({
  id: `${amount}-${categoryId}`, userId: SEED_USER_IDS.joao, type: "EXPENSE", nature: "PERSONAL",
  description: "Teste de orçamento", amount, date: "2026-09-03", categoryId,
  accountId: "main", paymentMethod: "PIX", status: "PAID", recurrenceType: "SINGLE",
  createdAt: "2026-09-03T00:00:00.000Z", updatedAt: "2026-09-03T00:00:00.000Z",
});

describe("budget derivation from transactions", () => {
  it("recalculates when an expense is created, edited, re-categorized, and removed", () => {
    const base: Transaction[] = [];
    const created = [...base, expense(100)];
    const edited = [expense(150)];
    const recategorized = [expense(150, "food")];
    expect(budgetSpent(budget, base)).toBe(0);
    expect(budgetSpent(budget, created)).toBe(100);
    expect(budgetSpent(budget, edited)).toBe(150);
    expect(budgetSpent(budget, recategorized)).toBe(0);
    expect(budgetSpent({ ...budget, categoryId: "food" }, recategorized)).toBe(150);
    expect(budgetSpent(budget, [])).toBe(0);
  });

  it("ignores transfers, income, and expenses outside the budget month", () => {
    const income = { ...expense(400), type: "INCOME" as const };
    const transfer = { ...expense(400), type: "TRANSFER" as const };
    const previousMonth = { ...expense(400), date: "2026-08-31" };
    expect(budgetSpent(budget, [income, transfer, previousMonth])).toBe(0);
  });
});
