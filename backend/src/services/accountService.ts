import { mockDatabase } from "../data/mockDatabase.js";
import type { Account, Transaction } from "../domain/types.js";

const settled = (transaction: Transaction) =>
  transaction.status === "PAID" || transaction.status === "RECEIVED";

/** The only balance source for transactional accounts in the mock ledger. */
export function accountBalance(accountId: string, transactions = mockDatabase.transactions) {
  const account = mockDatabase.accounts.find((item) => item.id === accountId);
  if (!account) throw new Error("Conta não encontrada.");
  const balance = transactions.filter(settled).reduce((balance, transaction) => {
    if (transaction.type === "INCOME" && transaction.accountId === accountId) return balance + transaction.amount;
    if (transaction.type === "EXPENSE" && transaction.accountId === accountId && transaction.paymentMethod !== "CREDIT") return balance - transaction.amount;
    if (transaction.type === "TRANSFER") {
      const source = transaction.sourceAccountId ?? (transaction.destinationPiggyBankId ? transaction.accountId : undefined);
      const destination = transaction.destinationAccountId;
      if (source === accountId) balance -= transaction.amount;
      if (destination === accountId) balance += transaction.amount;
    }
    return balance;
  }, account.initialBalance);
  return Math.round(balance * 100) / 100;
}

export function accountsWithBalances() {
  return mockDatabase.accounts.map((account) => ({
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
