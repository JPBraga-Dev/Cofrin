import { mockDatabase } from "../data/mockDatabase.js";
import type { Group, GroupContribution, PiggyBank, Transaction } from "../domain/types.js";
import { accountBalance, accountById } from "./accountService.js";
import { CURRENT_USER_ID } from "./socialService.js";

const stamp = () => new Date().toISOString();
const day = () => stamp().slice(0, 10);

export type PiggyTransferResult = { piggy: PiggyBank; transaction: Transaction };

/**
 * Executes internal transfers as one logical operation. The mock implementation
 * restores every mutated collection if validation or persistence fails.
 */
function atomicPiggyTransfer(input: { piggyId: string; accountId: string; amount: number; direction: "TO_PIGGY" | "FROM_PIGGY"; date?: string; description?: string }): PiggyTransferResult {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Informe um valor maior que zero.");
  const amount = Math.round(input.amount * 100) / 100;
  const piggy = mockDatabase.piggyBanks.find((item) => item.id === input.piggyId);
  if (!piggy) throw new Error("Porquinho não encontrado.");
  const account = accountById(input.accountId);
  const available = accountBalance(account.id);
  if (input.direction === "TO_PIGGY" && amount > available) throw new Error("Saldo insuficiente nesta conta.");
  if (input.direction === "FROM_PIGGY" && amount > piggy.currentAmount) throw new Error("Saldo insuficiente no porquinho.");

  const previousPiggy = { ...piggy, movements: [...piggy.movements] };
  const transactionCount = mockDatabase.transactions.length;
  try {
    const createdAt = stamp();
    const incoming = input.direction === "TO_PIGGY";
    const nextAmount = Math.round((piggy.currentAmount + (incoming ? amount : -amount)) * 100) / 100;
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      userId: piggy.userId,
      type: "TRANSFER",
      nature: "PIGGY_BANK",
      description: incoming ? `${account.name} → ${piggy.name}` : `${piggy.name} → ${account.name}`,
      amount,
      date: input.date ?? day(),
      categoryId: "transfer",
      accountId: account.id,
      sourceAccountId: incoming ? account.id : undefined,
      destinationAccountId: incoming ? undefined : account.id,
      sourcePiggyBankId: incoming ? undefined : piggy.id,
      destinationPiggyBankId: incoming ? piggy.id : undefined,
      paymentMethod: "TRANSFER",
      status: "PAID",
      recurrenceType: "SINGLE",
      notes: input.description?.trim() || undefined,
      createdAt,
      updatedAt: createdAt,
    };
    mockDatabase.transactions.unshift(transaction);
    piggy.currentAmount = nextAmount;
    piggy.status = nextAmount >= piggy.targetAmount ? "COMPLETED" : "ACTIVE";
    piggy.updatedAt = createdAt;
    piggy.movements.unshift({
      id: crypto.randomUUID(), piggyBankId: piggy.id, userId: piggy.userId,
      type: incoming ? "DEPOSIT" : "WITHDRAWAL", amount,
      date: transaction.date, description: transaction.description, accountId: account.id,
      transactionId: transaction.id, createdAt,
    });
    return { piggy, transaction };
  } catch (error) {
    Object.assign(piggy, previousPiggy);
    mockDatabase.transactions.splice(0, mockDatabase.transactions.length - transactionCount);
    throw error;
  }
}

export const transferAccountToPiggy = (piggyId: string, accountId: string, amount: number, date?: string, description?: string) =>
  atomicPiggyTransfer({ piggyId, accountId, amount, date, description, direction: "TO_PIGGY" });
export const transferPiggyToAccount = (piggyId: string, accountId: string, amount: number, date?: string, description?: string) =>
  atomicPiggyTransfer({ piggyId, accountId, amount, date, description, direction: "FROM_PIGGY" });

export type GroupFundTransferResult = { group: Group; contribution: GroupContribution; transaction: Transaction };
export function transferAccountToGroupFund(groupId: string, sourceAccountId: string, amountInput: number, date = day()): GroupFundTransferResult {
  if (!Number.isFinite(amountInput) || amountInput <= 0) throw new Error("Informe um valor maior que zero.");
  const amount = Math.round(amountInput * 100) / 100;
  const group = mockDatabase.groups.find((item) => item.id === groupId);
  if (!group) throw new Error("Grupo não encontrado.");
  if (!group.members.some((member) => member.userId === CURRENT_USER_ID && member.status === "ACTIVE")) throw new Error("Você não participa deste grupo.");
  const account = accountById(sourceAccountId);
  if (account.userId !== CURRENT_USER_ID) throw new Error("Você só pode usar uma conta própria.");
  if (amount > accountBalance(account.id)) throw new Error("Saldo insuficiente nesta conta.");

  const contributionsBefore = [...group.contributions];
  const transactionCount = mockDatabase.transactions.length;
  try {
    const createdAt = stamp();
    const transaction: Transaction = {
      id: crypto.randomUUID(), userId: CURRENT_USER_ID, type: "TRANSFER", nature: "GROUP",
      description: `${account.name} → Fundo ${group.name}`, amount, date, categoryId: "transfer",
      accountId: account.id, sourceAccountId: account.id, destinationGroupId: group.id,
      paymentMethod: "TRANSFER", status: "PAID", recurrenceType: "SINGLE", createdAt, updatedAt: createdAt,
    };
    const contribution: GroupContribution = {
      id: crypto.randomUUID(), groupId: group.id, userId: CURRENT_USER_ID, amount,
      sourceAccountId: account.id, financialTransactionId: transaction.id, date,
      status: "CONFIRMED", createdAt,
    };
    mockDatabase.transactions.unshift(transaction);
    group.contributions = [...group.contributions, contribution];
    group.updatedAt = createdAt;
    return { group, contribution, transaction };
  } catch (error) {
    group.contributions = contributionsBefore;
    mockDatabase.transactions.splice(0, mockDatabase.transactions.length - transactionCount);
    throw error;
  }
}

export function transferBetweenAccounts(sourceAccountId: string, destinationAccountId: string, amount: number) {
  if (sourceAccountId === destinationAccountId) throw new Error("Escolha contas diferentes.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Informe um valor maior que zero.");
  const source = accountById(sourceAccountId);
  const destination = accountById(destinationAccountId);
  if (amount > accountBalance(source.id)) throw new Error("Saldo insuficiente nesta conta.");
  const createdAt = stamp();
  const transaction: Transaction = { id: crypto.randomUUID(), userId: source.userId, type: "TRANSFER", nature: "ACCOUNT_TRANSFER", description: `${source.name} → ${destination.name}`, amount, date: day(), categoryId: "transfer", accountId: source.id, sourceAccountId: source.id, destinationAccountId: destination.id, paymentMethod: "TRANSFER", status: "PAID", recurrenceType: "SINGLE", createdAt, updatedAt: createdAt };
  mockDatabase.transactions.unshift(transaction);
  return transaction;
}
