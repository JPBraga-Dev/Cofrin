import { afterEach, describe, expect, it } from "vitest";
import { mockDatabase } from "../src/data/mockDatabase.js";
import { accountBalance } from "../src/services/accountService.js";
import { transferAccountToPiggy, transferPiggyToAccount } from "../src/services/transferService.js";

const piggy = () => mockDatabase.piggyBanks.find((item) => item.id === "p1")!;
let transactionCount = 0;
let piggySnapshot: ReturnType<typeof piggy> | undefined;

function snapshot() {
  transactionCount = mockDatabase.transactions.length;
  const current = piggy();
  piggySnapshot = { ...current, movements: [...current.movements] };
}
afterEach(() => {
  if (piggySnapshot) Object.assign(piggy(), piggySnapshot);
  mockDatabase.transactions.splice(0, mockDatabase.transactions.length - transactionCount);
  piggySnapshot = undefined;
});

describe("internal piggy transfers", () => {
  it("preserves total money while moving an account balance into a piggy bank", () => {
    snapshot();
    const accountBefore = accountBalance("main");
    const piggyBefore = piggy().currentAmount;
    const totalBefore = accountBefore + piggyBefore;

    const result = transferAccountToPiggy("p1", "main", 500);

    expect(result.transaction.type).toBe("TRANSFER");
    expect(accountBalance("main")).toBe(accountBefore - 500);
    expect(piggy().currentAmount).toBe(piggyBefore + 500);
    expect(accountBalance("main") + piggy().currentAmount).toBe(totalBefore);
  });

  it("rejects insufficient funds without a partial mutation", () => {
    snapshot();
    const accountBefore = accountBalance("main");
    const piggyBefore = piggy().currentAmount;
    const transactionBefore = mockDatabase.transactions.length;

    expect(() => transferAccountToPiggy("p1", "main", accountBefore + 0.01)).toThrow("Saldo insuficiente");
    expect(accountBalance("main")).toBe(accountBefore);
    expect(piggy().currentAmount).toBe(piggyBefore);
    expect(mockDatabase.transactions).toHaveLength(transactionBefore);
  });

  it("preserves total money when returning money to an account", () => {
    snapshot();
    const accountBefore = accountBalance("wallet");
    const piggyBefore = piggy().currentAmount;
    const totalBefore = accountBefore + piggyBefore;

    transferPiggyToAccount("p1", "wallet", 300);

    expect(accountBalance("wallet")).toBe(accountBefore + 300);
    expect(piggy().currentAmount).toBe(piggyBefore - 300);
    expect(accountBalance("wallet") + piggy().currentAmount).toBe(totalBefore);
  });
});
