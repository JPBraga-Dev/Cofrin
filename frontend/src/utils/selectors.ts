import type { Budget, Group, PiggyBank, Transaction } from "../types";

const categories: Record<string, string> = {
  salary: "Salário",
  freelance: "Freelance",
  housing: "Moradia",
  food: "Alimentação",
  transport: "Transporte",
  health: "Saúde",
  subscriptions: "Assinaturas",
  leisure: "Lazer",
  education: "Educação",
  reimbursement: "Reembolso",
  bonus: "Bônus",
  goals: "Metas",
  other: "Outros",
};
const accounts: Record<string, string> = {
  main: "Conta principal",
  "card-main": "Cartão principal",
  wallet: "Carteira",
};
export const categoryName = (id: string) => categories[id] ?? id;
export const accountName = (id: string) => accounts[id] ?? id;
export const groupLabel = (type: Group["type"]) =>
  ({
    TRIP: "Viagem",
    EVENT: "Evento",
    HOUSE: "Casa",
    GIFT: "Presente",
    COUPLE: "Casal",
    GOAL: "Meta",
    OTHER: "Outro",
  })[type];
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
export const transactionTotals = (transactions: Transaction[]) =>
  transactions.reduce(
    (total, item) => ({
      income: total.income + (item.type === "INCOME" ? item.amount : 0),
      expense: total.expense + (item.type === "EXPENSE" ? item.amount : 0),
    }),
    { income: 0, expense: 0 },
  );
export const spendingByCategory = (transactions: Transaction[]) =>
  Object.entries(
    transactions
      .filter((item) => item.type === "EXPENSE")
      .reduce<Record<string, number>>(
        (result, item) => ({
          ...result,
          [item.categoryId]: (result[item.categoryId] ?? 0) + item.amount,
        }),
        {},
      ),
  ).map(([categoryId, amount]) => ({
    categoryId,
    name: categoryName(categoryId),
    amount,
  }));
export const piggyTotal = (piggies: PiggyBank[]) =>
  piggies.reduce((total, item) => total + item.currentAmount, 0);
export const budgetSpent = (budget: Budget, transactions: Transaction[]) =>
  transactions
    .filter(
      (item) =>
        item.type === "EXPENSE" &&
        item.categoryId === budget.categoryId &&
        (!budget.referenceMonth || item.date.startsWith(budget.referenceMonth)),
    )
    .reduce((total, item) => total + item.amount, 0);
