import { afterEach, describe, expect, it } from "vitest";
import { mockDatabase } from "../src/data/mockDatabase.js";
import type { Transaction } from "../src/domain/types.js";
import { accountBalance, accountsWithBalances } from "../src/services/accountService.js";
import { SEED_USER_IDS } from "../src/data/seedIds.js";

let transactionCount = 0;
const snapshot = () => { transactionCount = mockDatabase.transactions.length; };
afterEach(() => mockDatabase.transactions.splice(0, mockDatabase.transactions.length - transactionCount));

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: crypto.randomUUID(), userId: SEED_USER_IDS.joao, type: "EXPENSE", nature: "PERSONAL",
    description: "Teste", amount: 1, date: "2026-09-03", categoryId: "other",
    accountId: "main", paymentMethod: "PIX", status: "PAID", recurrenceType: "SINGLE",
    createdAt: "2026-09-03T12:00:00.000Z", updatedAt: "2026-09-03T12:00:00.000Z",
    ...overrides,
  };
}

describe("account ledger", () => {
  it("updates account and available balance for income and cash expense only", () => {
    snapshot();
    const mainBefore = accountBalance("main");
    const availableBefore = accountsWithBalances().reduce((total, account) => total + account.balance, 0);
    mockDatabase.transactions.unshift(
      transaction({ type: "INCOME", amount: 5000, status: "RECEIVED", categoryId: "salary" }),
      transaction({ type: "EXPENSE", amount: 300, categoryId: "food" }),
      transaction({ type: "EXPENSE", amount: 800, accountId: "card-main", paymentMethod: "CREDIT", nature: "CREDIT_CARD" }),
    );
    expect(accountBalance("main")).toBe(mainBefore + 4700);
    expect(accountsWithBalances().reduce((total, account) => total + account.balance, 0)).toBe(availableBefore + 4700);
  });

  it("does not classify an internal transfer as income or expense", () => {
    snapshot();
    const incomeBefore = mockDatabase.transactions.filter((item) => item.type === "INCOME").reduce((total, item) => total + item.amount, 0);
    const expenseBefore = mockDatabase.transactions.filter((item) => item.type === "EXPENSE").reduce((total, item) => total + item.amount, 0);
    mockDatabase.transactions.unshift(transaction({ type: "TRANSFER", nature: "ACCOUNT_TRANSFER", amount: 250, categoryId: "transfer", paymentMethod: "TRANSFER", sourceAccountId: "main", destinationAccountId: "wallet" }));
    const incomeAfter = mockDatabase.transactions.filter((item) => item.type === "INCOME").reduce((total, item) => total + item.amount, 0);
    const expenseAfter = mockDatabase.transactions.filter((item) => item.type === "EXPENSE").reduce((total, item) => total + item.amount, 0);
    expect(incomeAfter).toBe(incomeBefore);
    expect(expenseAfter).toBe(expenseBefore);
  });
});
