import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mockDatabase } from "../src/data/mockDatabase.js";
import { SEED_USER_IDS } from "../src/data/seedIds.js";
import { accountBalance } from "../src/services/accountService.js";
import { groupFund } from "../src/services/groupFinanceService.js";
import { registerGroupExpense } from "../src/services/transferService.js";
import { fromCents, toCents } from "../src/domain/money.js";

const group = () => mockDatabase.groups.find((item) => item.id === "g1")!;
let expensesBefore = [...group().expenses];
let movementsBefore = [...(group().fundMovements ?? [])];
let updatedAtBefore = group().updatedAt;
let transactionCount = mockDatabase.transactions.length;

beforeEach(() => {
  expensesBefore = [...group().expenses];
  movementsBefore = [...(group().fundMovements ?? [])];
  updatedAtBefore = group().updatedAt;
  transactionCount = mockDatabase.transactions.length;
});

afterEach(() => {
  group().expenses = expensesBefore;
  group().fundMovements = movementsBefore;
  group().updatedAt = updatedAtBefore;
  mockDatabase.transactions.splice(0, mockDatabase.transactions.length - transactionCount);
});

const input = (overrides: Partial<Parameters<typeof registerGroupExpense>[2]> = {}) => ({
  description: "Passeio de buggy",
  amount: 300.1,
  paidByUserId: SEED_USER_IDS.joao,
  date: "2026-09-04",
  category: "leisure",
  splitType: "EQUAL" as const,
  paymentSource: "MEMBER" as const,
  participants: group().members.map((member) => ({ userId: member.userId })),
  ...overrides,
});

describe("group expense ledger", () => {
  it("debits the selected private account when the authenticated member pays", () => {
    const balanceBefore = accountBalance("main");
    const result = registerGroupExpense(SEED_USER_IDS.joao, "g1", input({ sourceAccountId: "main" }));

    expect(accountBalance("main")).toBe(fromCents(toCents(balanceBefore) - toCents(300.1)));
    expect(result.transaction).toMatchObject({ type: "EXPENSE", financialScope: "PERSONAL", accountId: "main", groupId: "g1" });
    expect(result.expense.financialTransactionId).toBe(result.transaction?.id);
  });

  it("uses only the shared fund when GROUP_FUND is selected", () => {
    const fundBefore = groupFund(group());
    const privateBalanceBefore = accountBalance("main");
    const result = registerGroupExpense(SEED_USER_IDS.joao, "g1", input({ paymentSource: "GROUP_FUND", sourceAccountId: undefined }));

    expect(groupFund(group())).toBe(fundBefore - 300.1);
    expect(accountBalance("main")).toBe(privateBalanceBefore);
    expect(result.transaction).toMatchObject({ financialScope: "SHARED", paymentMethod: "GROUP_FUND" });
    expect(result.fundMovement?.expenseId).toBe(result.expense.id);
  });

  it("records another member's payment without touching any private account", () => {
    const balancesBefore = mockDatabase.accounts.map((account) => [account.id, accountBalance(account.id)] as const);
    const result = registerGroupExpense(SEED_USER_IDS.joao, "g1", input({ paidByUserId: SEED_USER_IDS.maria }));

    expect(result.transaction).toBeUndefined();
    expect(result.expense.paidByUserId).toBe(SEED_USER_IDS.maria);
    expect(mockDatabase.accounts.map((account) => [account.id, accountBalance(account.id)] as const)).toEqual(balancesBefore);
  });

  it("rejects insufficient shared funds without partial writes", () => {
    const transactionCountBefore = mockDatabase.transactions.length;
    const expenseCountBefore = group().expenses.length;
    expect(() => registerGroupExpense(SEED_USER_IDS.joao, "g1", input({ amount: groupFund(group()) + 0.01, paymentSource: "GROUP_FUND" }))).toThrow("Saldo insuficiente");
    expect(mockDatabase.transactions).toHaveLength(transactionCountBefore);
    expect(group().expenses).toHaveLength(expenseCountBefore);
  });
});
