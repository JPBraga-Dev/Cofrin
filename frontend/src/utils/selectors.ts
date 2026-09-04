import type { Budget, CreditCard, Group, InvoiceSummary, InvoiceView, PiggyBank, Transaction } from "../types";

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
export const personalLedgerTransactions = (transactions: Transaction[]) =>
  transactions.filter((item) => item.financialScope !== "SHARED");
export const expenseObligations = (transactions: Transaction[]) =>
  personalLedgerTransactions(transactions).filter(
    (item) =>
      item.type === "EXPENSE" &&
      (item.status === "PENDING" || item.status === "OVERDUE"),
  );
export const spendingByCategory = (transactions: Transaction[]) =>
  Object.entries(
    personalLedgerTransactions(transactions)
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
export const groupFundValue = (group: Group) => {
  const toCents = (value: number) => Math.round((value + Number.EPSILON) * 100);
  const raised = toCents(group.initialFundAmount ?? 0) + group.contributions
    .filter((item) => item.status === "CONFIRMED")
    .reduce((total, item) => total + toCents(item.amount), 0);
  const spent = group.expenses
    .filter((item) => item.paymentSource === "GROUP_FUND")
    .reduce((total, item) => total + toCents(item.amount), 0);
  return (raised - spent) / 100;
};
export const budgetSpent = (budget: Budget, transactions: Transaction[]) =>
  personalLedgerTransactions(transactions)
    .filter(
      (item) =>
        item.type === "EXPENSE" &&
        item.categoryId === budget.categoryId &&
        (!budget.referenceMonth || item.date.startsWith(budget.referenceMonth)),
    )
    .reduce((total, item) => total + item.amount, 0);

const addMonths = (date: string, offset: number) => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + offset);
  return value.toISOString().slice(0, 10);
};
const monthOffset = (month: string, offset: number) => addMonths(`${month}-01`, offset).slice(0, 7);
const safeMonthDay = (month: string, day: number) => {
  const [year, numericMonth] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, numericMonth, 0)).getUTCDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, "0")}`;
};
export const invoiceReferenceForPurchase = (date: string, card: Pick<CreditCard, "closingDay" | "dueDay">) => {
  const month = date.slice(0, 7);
  const closingMonth = Number(date.slice(8, 10)) <= card.closingDay ? month : monthOffset(month, 1);
  return card.closingDay < card.dueDay ? closingMonth : monthOffset(closingMonth, 1);
};
export const cardInvoiceSummary = (card: CreditCard, transactions: Transaction[], today = new Date().toISOString().slice(0, 10)): InvoiceSummary => {
  const purchases = transactions.filter((item) => item.type === "EXPENSE" && (item.creditCardId === card.id || item.accountId === card.id));
  const payments = transactions.filter((item) => item.type === "TRANSFER" && item.destinationCreditCardId === card.id);
  const grouped = new Map<string, Transaction[]>();
  purchases.forEach((item) => {
    const reference = item.invoiceReference ?? invoiceReferenceForPurchase(item.date, card);
    grouped.set(reference, [...(grouped.get(reference) ?? []), item]);
  });
  const invoices: InvoiceView[] = [...grouped.entries()].map(([referenceMonth, items]) => {
    const closingMonth = card.closingDay < card.dueDay ? referenceMonth : monthOffset(referenceMonth, -1);
    const closingDate = safeMonthDay(closingMonth, card.closingDay);
    const dueDate = safeMonthDay(referenceMonth, card.dueDay);
    const total = items.reduce((sum, item) => sum + Math.round(item.amount * 100), 0) / 100;
    const paidAmount = payments.filter((item) => item.invoiceReference === referenceMonth).reduce((sum, item) => sum + Math.round(item.amount * 100), 0) / 100;
    const remainingAmount = Math.max(0, Math.round((total - paidAmount) * 100) / 100);
    const status: InvoiceView["status"] = remainingAmount === 0 ? "PAID" : today > dueDate ? "OVERDUE" : today > closingDate ? "CLOSED" : "OPEN";
    return { referenceMonth, closingDate, dueDate, status, total, paidAmount: Math.min(total, paidAmount), remainingAmount, items: [...items].sort((a, b) => b.date.localeCompare(a.date)) };
  }).sort((a, b) => a.referenceMonth.localeCompare(b.referenceMonth));
  const currentReference = invoiceReferenceForPurchase(today, card);
  const usedLimit = invoices.reduce((sum, invoice) => sum + Math.round(invoice.remainingAmount * 100), 0) / 100;
  return { cardId: card.id, currentReference, invoices, currentInvoice: invoices.find((item) => item.referenceMonth === currentReference), nextInvoice: invoices.find((item) => item.referenceMonth > currentReference), futureInvoices: invoices.filter((item) => item.referenceMonth > currentReference), usedLimit, availableLimit: Math.max(0, Math.round((card.limit - usedLimit) * 100) / 100) };
};
