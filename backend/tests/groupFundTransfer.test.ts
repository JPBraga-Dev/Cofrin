import { afterEach, describe, expect, it } from "vitest";
import { mockDatabase } from "../src/data/mockDatabase.js";
import { accountsWithBalances } from "../src/services/accountService.js";
import { groupFund } from "../src/services/groupFinanceService.js";
import { transferAccountToGroupFund } from "../src/services/transferService.js";
import { SEED_USER_IDS } from "../src/data/seedIds.js";

const group = () => mockDatabase.groups.find((item) => item.id === "g1")!;
let transactionCount = 0;
let contributionSnapshot: ReturnType<typeof group>["contributions"] = [];
let updatedAt = "";

const availableBalance = () => accountsWithBalances().reduce((total, account) => total + account.balance, 0);
function snapshot() {
  transactionCount = mockDatabase.transactions.length;
  contributionSnapshot = [...group().contributions];
  updatedAt = group().updatedAt;
}
afterEach(() => {
  group().contributions = contributionSnapshot;
  group().updatedAt = updatedAt;
  mockDatabase.transactions.splice(0, mockDatabase.transactions.length - transactionCount);
});

describe("group fund contributions", () => {
  it("moves R$ 3.000 from an account to Jeri without changing income or expenses", () => {
    snapshot();
    const availableBefore = availableBalance();
    const fundBefore = groupFund(group());
    const incomeBefore = mockDatabase.transactions.filter((item) => item.type === "INCOME").reduce((total, item) => total + item.amount, 0);
    const expensesBefore = mockDatabase.transactions.filter((item) => item.type === "EXPENSE").reduce((total, item) => total + item.amount, 0);
    expect(availableBefore).toBe(19186.9);
    expect(fundBefore).toBe(5600);

    const result = transferAccountToGroupFund(SEED_USER_IDS.joao, "g1", "main", 3000, "2026-09-03");

    expect(availableBalance()).toBe(16186.9);
    expect(groupFund(group())).toBe(8600);
    expect(result.transaction.type).toBe("TRANSFER");
    expect(result.transaction.destinationGroupId).toBe("g1");
    expect(group().contributions.filter((item) => item.financialTransactionId === result.transaction.id)).toHaveLength(1);
    expect(mockDatabase.transactions.filter((item) => item.destinationGroupId === "g1" && item.amount === 3000)).toHaveLength(1);
    expect(mockDatabase.transactions.filter((item) => item.type === "INCOME").reduce((total, item) => total + item.amount, 0)).toBe(incomeBefore);
    expect(mockDatabase.transactions.filter((item) => item.type === "EXPENSE").reduce((total, item) => total + item.amount, 0)).toBe(expensesBefore);
  });

  it("does not mutate any ledger state on insufficient balance", () => {
    snapshot();
    const availableBefore = availableBalance();
    const fundBefore = groupFund(group());
    const contributionsBefore = group().contributions.length;
    const transactionsBefore = mockDatabase.transactions.length;

    expect(() => transferAccountToGroupFund(SEED_USER_IDS.joao, "g1", "wallet", 3000)).toThrow("Saldo insuficiente");
    expect(availableBalance()).toBe(availableBefore);
    expect(groupFund(group())).toBe(fundBefore);
    expect(group().contributions).toHaveLength(contributionsBefore);
    expect(mockDatabase.transactions).toHaveLength(transactionsBefore);
  });

  it("rejects a non-member destination before creating a transfer", () => {
    snapshot();
    const transactionsBefore = mockDatabase.transactions.length;
    const contributionsBefore = group().contributions.length;
    expect(() => transferAccountToGroupFund(SEED_USER_IDS.joao, "missing-group", "main", 1)).toThrow("Grupo não encontrado");
    expect(mockDatabase.transactions).toHaveLength(transactionsBefore);
    expect(group().contributions).toHaveLength(contributionsBefore);
  });
});
