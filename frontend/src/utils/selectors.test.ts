import { describe, expect, it } from "vitest";
import type { Budget, CreditCard, Transaction } from "../types";
import { budgetSpent, cardInvoiceSummary, expenseObligations, groupFundValue, spendingByCategory } from "./selectors";

const transaction = (overrides: Partial<Transaction>): Transaction => ({
  id: crypto.randomUUID(), userId: "user", type: "EXPENSE", nature: "PERSONAL",
  description: "Teste", amount: 10, date: "2026-09-04", categoryId: "food", accountId: "main",
  paymentMethod: "PIX", status: "PAID", recurrenceType: "SINGLE", createdAt: "2026-09-04T10:00:00Z", updatedAt: "2026-09-04T10:00:00Z",
  ...overrides,
});

describe("dashboard selectors", () => {
  it("counts only pending or overdue personal expenses as obligations", () => {
    const items = [
      transaction({ id: "expense", status: "PENDING", amount: 100 }),
      transaction({ id: "income", type: "INCOME", status: "PENDING", amount: 500 }),
      transaction({ id: "transfer", type: "TRANSFER", status: "PENDING", amount: 200 }),
      transaction({ id: "shared", status: "OVERDUE", financialScope: "SHARED", amount: 300 }),
    ];
    expect(expenseObligations(items).map((item) => item.id)).toEqual(["expense"]);
  });

  it("keeps budgets isolated by reference month and shared scope", () => {
    const budget: Budget = { id: "b", userId: "user", categoryId: "food", limitAmount: 500, currentAmount: 0, period: "MONTHLY", referenceMonth: "2026-09", createdAt: "", updatedAt: "" };
    const items = [transaction({ amount: 30 }), transaction({ amount: 20, date: "2026-08-30" }), transaction({ amount: 40, financialScope: "SHARED" })];
    expect(budgetSpent(budget, items)).toBe(30);
    expect(spendingByCategory(items).find((item) => item.categoryId === "food")?.amount).toBe(50);
  });

  it("derives a group fund in cents", () => {
    expect(groupFundValue({ id: "g", ownerId: "u", name: "G", description: "", type: "OTHER", initialFundAmount: 0.1, status: "ACTIVE", members: [], contributions: [{ id: "c", groupId: "g", userId: "u", amount: 0.2, date: "", status: "CONFIRMED", createdAt: "" }], expenses: [], settlements: [], createdAt: "", updatedAt: "" })).toBe(0.3);
  });
});

describe("credit-card selectors", () => {
  const card: CreditCard = { id: "card", userId: "user", name: "Principal", brand: "Visa", lastFourDigits: "1234", limit: 1000, closingDay: 4, dueDay: 11, color: "carbon", isActive: true, createdAt: "", updatedAt: "" };
  it("groups purchases by closing cycle and releases limit after a transfer payment", () => {
    const purchase = transaction({ id: "purchase", accountId: card.id, creditCardId: card.id, paymentMethod: "CREDIT", date: "2026-09-05", amount: 300 });
    const payment = transaction({ id: "payment", type: "TRANSFER", categoryId: "invoice-payment", amount: 100, destinationCreditCardId: card.id, invoiceReference: "2026-10" });
    const summary = cardInvoiceSummary(card, [purchase, payment], "2026-09-06");
    expect(summary.currentInvoice?.referenceMonth).toBe("2026-10");
    expect(summary.currentInvoice?.remainingAmount).toBe(200);
    expect(summary.availableLimit).toBe(800);
  });
});
