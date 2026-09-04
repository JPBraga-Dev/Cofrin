import { mockDatabase } from "../data/mockDatabase.js";
import type { Group, GroupContribution, GroupExpense, GroupFundMovement, PiggyBank, Transaction } from "../domain/types.js";
import { accountBalance } from "./accountService.js";
import { AppError } from "../utils/appError.js";
import { fromCents, toCents } from "../domain/money.js";
import { createSplits, groupFund, type SplitInput } from "./groupFinanceService.js";

const stamp = () => new Date().toISOString();
const day = () => stamp().slice(0, 10);

export type PiggyTransferResult = { piggy: PiggyBank; transaction: Transaction };

/**
 * Executes internal transfers as one logical operation. The mock implementation
 * restores every mutated collection if validation or persistence fails.
 */
function atomicPiggyTransfer(input: { piggyId: string; accountId: string; amount: number; direction: "TO_PIGGY" | "FROM_PIGGY"; date?: string; description?: string }, userId: string): PiggyTransferResult {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Informe um valor maior que zero.");
  const amountInCents = toCents(input.amount);
  const amount = fromCents(amountInCents);
  const piggy = mockDatabase.piggyBanks.find((item) => item.id === input.piggyId);
  if (!piggy || piggy.userId !== userId) throw new AppError(404, "PIGGY_NOT_FOUND", "Porquinho não encontrado.");
  const account = mockDatabase.accounts.find((item) => item.id === input.accountId && item.userId === userId);
  if (!account) throw new AppError(404, "ACCOUNT_NOT_FOUND", "Conta não encontrada.");
  const available = accountBalance(account.id);
  if (input.direction === "TO_PIGGY" && amountInCents > toCents(available)) throw new Error("Saldo insuficiente nesta conta.");
  if (input.direction === "FROM_PIGGY" && amountInCents > toCents(piggy.currentAmount)) throw new Error("Saldo insuficiente no porquinho.");

  const previousPiggy = { ...piggy, movements: [...piggy.movements] };
  const transactionCount = mockDatabase.transactions.length;
  try {
    const createdAt = stamp();
    const incoming = input.direction === "TO_PIGGY";
    const nextAmount = fromCents(toCents(piggy.currentAmount) + (incoming ? amountInCents : -amountInCents));
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

export const transferAccountToPiggy = (userId: string, piggyId: string, accountId: string, amount: number, date?: string, description?: string) =>
  atomicPiggyTransfer({ piggyId, accountId, amount, date, description, direction: "TO_PIGGY" }, userId);
export const transferPiggyToAccount = (userId: string, piggyId: string, accountId: string, amount: number, date?: string, description?: string) =>
  atomicPiggyTransfer({ piggyId, accountId, amount, date, description, direction: "FROM_PIGGY" }, userId);

export type GroupFundTransferResult = { group: Group; contribution: GroupContribution; transaction: Transaction };
export function transferAccountToGroupFund(userId: string, groupId: string, sourceAccountId: string, amountInput: number, date = day()): GroupFundTransferResult {
  if (!Number.isFinite(amountInput) || amountInput <= 0) throw new Error("Informe um valor maior que zero.");
  const amountInCents = toCents(amountInput);
  const amount = fromCents(amountInCents);
  const group = mockDatabase.groups.find((item) => item.id === groupId);
  if (!group || !group.members.some((member) => member.userId === userId && member.status === "ACTIVE"))
    throw new AppError(404, "GROUP_NOT_FOUND", "Grupo não encontrado.");
  const account = mockDatabase.accounts.find((item) => item.id === sourceAccountId && item.userId === userId);
  if (!account) throw new AppError(404, "ACCOUNT_NOT_FOUND", "Conta não encontrada.");
  if (amountInCents > toCents(accountBalance(account.id))) throw new Error("Saldo insuficiente nesta conta.");

  const contributionsBefore = [...group.contributions];
  const transactionCount = mockDatabase.transactions.length;
  try {
    const createdAt = stamp();
    const transaction: Transaction = {
      id: crypto.randomUUID(), userId, type: "TRANSFER", nature: "GROUP",
      description: `${account.name} → Fundo ${group.name}`, amount, date, categoryId: "transfer",
      accountId: account.id, sourceAccountId: account.id, destinationGroupId: group.id,
      paymentMethod: "TRANSFER", status: "PAID", recurrenceType: "SINGLE", createdAt, updatedAt: createdAt,
    };
    const contribution: GroupContribution = {
      id: crypto.randomUUID(), groupId: group.id, userId, amount,
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

export function transferBetweenAccounts(userId: string, sourceAccountId: string, destinationAccountId: string, amount: number) {
  if (sourceAccountId === destinationAccountId) throw new Error("Escolha contas diferentes.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Informe um valor maior que zero.");
  const normalizedAmount = fromCents(toCents(amount));
  const source = mockDatabase.accounts.find((item) => item.id === sourceAccountId && item.userId === userId);
  const destination = mockDatabase.accounts.find((item) => item.id === destinationAccountId && item.userId === userId);
  if (!source || !destination) throw new AppError(404, "ACCOUNT_NOT_FOUND", "Conta não encontrada.");
  if (toCents(normalizedAmount) > toCents(accountBalance(source.id))) throw new Error("Saldo insuficiente nesta conta.");
  const createdAt = stamp();
  const transaction: Transaction = { id: crypto.randomUUID(), userId: source.userId, type: "TRANSFER", nature: "ACCOUNT_TRANSFER", description: `${source.name} → ${destination.name}`, amount: normalizedAmount, date: day(), categoryId: "transfer", accountId: source.id, sourceAccountId: source.id, destinationAccountId: destination.id, paymentMethod: "TRANSFER", status: "PAID", recurrenceType: "SINGLE", createdAt, updatedAt: createdAt };
  mockDatabase.transactions.unshift(transaction);
  return transaction;
}

export type GroupExpenseInput = {
  description: string;
  amount: number;
  paidByUserId: string;
  date?: string;
  category: string;
  splitType: GroupExpense["splitType"];
  paymentSource: GroupExpense["paymentSource"];
  sourceAccountId?: string;
  notes?: string;
  participants?: SplitInput[];
};

export type GroupExpenseResult = {
  group: Group;
  expense: GroupExpense;
  transaction?: Transaction;
  fundMovement?: GroupFundMovement;
};

/**
 * Registers a shared expense and its financial consequence as one logical unit.
 * A private account is touched only when the authenticated user explicitly pays.
 */
export function registerGroupExpense(userId: string, groupId: string, input: GroupExpenseInput): GroupExpenseResult {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Informe um valor maior que zero.");
  const amountInCents = toCents(input.amount);
  const amount = fromCents(amountInCents);
  const description = input.description.trim();
  if (!description) throw new Error("Informe uma descrição para a despesa.");

  const group = mockDatabase.groups.find((item) => item.id === groupId);
  const currentMember = group?.members.find((member) => member.userId === userId && member.status === "ACTIVE");
  if (!group || !currentMember) throw new AppError(404, "GROUP_NOT_FOUND", "Grupo não encontrado.");
  const payer = group.members.find((member) => member.userId === input.paidByUserId && member.status === "ACTIVE");
  if (!payer) throw new Error("Quem pagou precisa ser um participante ativo do grupo.");

  let account: (typeof mockDatabase.accounts)[number] | undefined;
  if (input.paymentSource === "GROUP_FUND") {
    if (amountInCents > toCents(groupFund(group))) throw new Error("Saldo insuficiente no fundo do grupo.");
  } else if (input.paidByUserId === userId) {
    if (!input.sourceAccountId) throw new Error("Escolha a conta usada no pagamento.");
    account = mockDatabase.accounts.find((item) => item.id === input.sourceAccountId && item.userId === userId);
    if (!account) throw new AppError(404, "ACCOUNT_NOT_FOUND", "Conta não encontrada.");
    if (amountInCents > toCents(accountBalance(account.id))) throw new Error("Saldo insuficiente nesta conta.");
  } else if (input.sourceAccountId) {
    throw new Error("Não é permitido acessar a conta privada de outro participante.");
  }

  const activeMemberIds = group.members.filter((member) => member.status === "ACTIVE").map((member) => member.userId);
  const participants = input.participants ?? activeMemberIds.map((participantId) => ({ userId: participantId }));
  if (participants.some((participant) => !activeMemberIds.includes(participant.userId)))
    throw new Error("A divisão contém uma pessoa que não participa ativamente do grupo.");

  const expensesBefore = [...group.expenses];
  const movementsBefore = [...(group.fundMovements ?? [])];
  const previousUpdatedAt = group.updatedAt;
  const transactionCount = mockDatabase.transactions.length;
  try {
    const createdAt = stamp();
    const expenseId = crypto.randomUUID();
    let transaction: Transaction | undefined;
    let fundMovement: GroupFundMovement | undefined;

    if (input.paymentSource === "GROUP_FUND") {
      fundMovement = {
        id: crypto.randomUUID(), groupId: group.id, expenseId, type: "EXPENSE", amount,
        date: input.date ?? day(), description, createdAt,
      };
      transaction = {
        id: crypto.randomUUID(), userId, type: "EXPENSE", nature: "GROUP", financialScope: "SHARED",
        description: `${description} · Fundo ${group.name}`, amount, date: input.date ?? day(),
        categoryId: input.category, accountId: `group-fund:${group.id}`, paymentMethod: "GROUP_FUND",
        status: "PAID", recurrenceType: "SINGLE", notes: input.notes?.trim() || undefined,
        groupId: group.id, createdAt, updatedAt: createdAt,
      };
    } else if (input.paidByUserId === userId && account) {
      transaction = {
        id: crypto.randomUUID(), userId, type: "EXPENSE", nature: "GROUP", financialScope: "PERSONAL",
        description: `${description} · ${group.name}`, amount, date: input.date ?? day(),
        categoryId: input.category, accountId: account.id, sourceAccountId: account.id,
        paymentMethod: "GROUP_PAYMENT", status: "PAID", recurrenceType: "SINGLE",
        notes: input.notes?.trim() || undefined, groupId: group.id, createdAt, updatedAt: createdAt,
      };
    }

    const expense: GroupExpense = {
      id: expenseId, groupId: group.id, description, amount, paidByUserId: input.paidByUserId,
      date: input.date ?? day(), category: input.category, splitType: input.splitType,
      paymentSource: input.paymentSource, sourceAccountId: account?.id,
      financialTransactionId: transaction?.id, fundMovementId: fundMovement?.id,
      notes: input.notes?.trim() || undefined,
      splits: createSplits(expenseId, amount, participants.map((item) => item.userId), input.splitType, participants),
      createdAt,
    };
    if (transaction) mockDatabase.transactions.unshift(transaction);
    group.expenses = [...group.expenses, expense];
    if (fundMovement) group.fundMovements = [...(group.fundMovements ?? []), fundMovement];
    group.updatedAt = createdAt;
    return { group, expense, transaction, fundMovement };
  } catch (error) {
    group.expenses = expensesBefore;
    group.fundMovements = movementsBefore;
    group.updatedAt = previousUpdatedAt;
    mockDatabase.transactions.splice(0, mockDatabase.transactions.length - transactionCount);
    throw error;
  }
}
