import { mockDatabase } from "../data/mockDatabase.js";
import type { Account, Transaction } from "../domain/types.js";
import { fromCents, toCents } from "../domain/money.js";

const settled = (transaction: Transaction) =>
  transaction.status === "PAID" || transaction.status === "RECEIVED";

/** The only balance source for transactional accounts in the mock ledger. */
export function accountBalance(accountId: string, transactions = mockDatabase.transactions) {
  const account = mockDatabase.accounts.find((item) => item.id === accountId);
  if (!account) throw new Error("Conta não encontrada.");
  const balanceInCents = transactions.filter(settled).reduce((balance, transaction) => {
    const amount = toCents(transaction.amount);
    if (transaction.type === "INCOME" && transaction.accountId === accountId) return balance + amount;
    if (transaction.type === "EXPENSE" && transaction.accountId === accountId && transaction.paymentMethod !== "CREDIT") return balance - amount;
    if (transaction.type === "TRANSFER") {
      const source = transaction.sourceAccountId ?? (transaction.destinationPiggyBankId ? transaction.accountId : undefined);
      const destination = transaction.destinationAccountId;
      if (source === accountId) balance -= amount;
      if (destination === accountId) balance += amount;
    }
    return balance;
  }, toCents(account.initialBalance) as number);
  return fromCents(balanceInCents);
}

export function accountsWithBalances(userId?: string) {
  return mockDatabase.accounts.filter((account) => !userId || account.userId === userId).map((account) => ({
    id: account.id,
    name: account.name,
    balance: accountBalance(account.id),
  }));
}

export function accountById(id: string): Account {
  const account = mockDatabase.accounts.find((item) => item.id === id);
  if (!account) throw new Error("Conta não encontrada.");
  return account;
}
