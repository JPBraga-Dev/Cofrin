import { mockDatabase } from "../data/mockDatabase.js";
import type { CreditCard, CreditCardInvoicePayment, Transaction } from "../domain/types.js";
import { fromCents, sumInCents, toCents } from "../domain/money.js";
import { accountBalance } from "./accountService.js";
import { AppError } from "../utils/appError.js";

const stamp = () => new Date().toISOString();
const day = () => stamp().slice(0, 10);

export function addMonths(date: string, offset: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + offset);
  return value.toISOString().slice(0, 10);
}

const monthOffset = (month: string, offset: number) => addMonths(`${month}-01`, offset).slice(0, 7);
const safeDay = (month: string, value: number) => {
  const [year, numericMonth] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, numericMonth, 0)).getUTCDate();
  return `${month}-${String(Math.min(value, lastDay)).padStart(2, "0")}`;
};

/** Invoice reference is the month in which that invoice is due. */
export function invoiceReferenceForPurchase(purchaseDate: string, card: Pick<CreditCard, "closingDay" | "dueDay">) {
  const month = purchaseDate.slice(0, 7);
  const purchaseDay = Number(purchaseDate.slice(8, 10));
  const closingMonth = purchaseDay <= card.closingDay ? month : monthOffset(month, 1);
  return card.closingDay < card.dueDay ? closingMonth : monthOffset(closingMonth, 1);
}

export function invoiceCycle(referenceMonth: string, card: Pick<CreditCard, "closingDay" | "dueDay">) {
  const closingMonth = card.closingDay < card.dueDay ? referenceMonth : monthOffset(referenceMonth, -1);
  return { closingDate: safeDay(closingMonth, card.closingDay), dueDate: safeDay(referenceMonth, card.dueDay) };
}

export function installmentSchedule(amount: number, count: number, purchaseDate: string, card: CreditCard) {
  const total = toCents(amount);
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, index) => {
    const date = addMonths(purchaseDate, index);
    return {
      amount: fromCents(base + (index < remainder ? 1 : 0)),
      date,
      installmentNumber: index + 1,
      invoiceReference: invoiceReferenceForPurchase(date, card),
    };
  });
}

export type InvoiceStatus = "OPEN" | "CLOSED" | "OVERDUE" | "PAID";
export type InvoiceView = {
  referenceMonth: string;
  closingDate: string;
  dueDate: string;
  status: InvoiceStatus;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  items: Transaction[];
};

export function cardInvoices(card: CreditCard, transactions = mockDatabase.transactions, payments = mockDatabase.invoicePayments, today = day()) {
  const purchases = transactions.filter((item) => item.userId === card.userId && item.type === "EXPENSE" && (item.creditCardId === card.id || item.accountId === card.id));
  const grouped = new Map<string, Transaction[]>();
  for (const purchase of purchases) {
    const reference = purchase.invoiceReference ?? invoiceReferenceForPurchase(purchase.date, card);
    grouped.set(reference, [...(grouped.get(reference) ?? []), purchase]);
  }
  const invoices: InvoiceView[] = [...grouped.entries()].map(([referenceMonth, items]) => {
    const { closingDate, dueDate } = invoiceCycle(referenceMonth, card);
    const totalInCents = sumInCents(items.map((item) => item.amount));
    const paidInCents = sumInCents(payments.filter((payment) => payment.cardId === card.id && payment.referenceMonth === referenceMonth).map((payment) => payment.amount));
    const remainingInCents = Math.max(0, totalInCents - paidInCents);
    const status: InvoiceStatus = remainingInCents === 0 ? "PAID" : today > dueDate ? "OVERDUE" : today > closingDate ? "CLOSED" : "OPEN";
    return { referenceMonth, closingDate, dueDate, status, total: fromCents(totalInCents), paidAmount: fromCents(Math.min(totalInCents, paidInCents)), remainingAmount: fromCents(remainingInCents), items: [...items].sort((a, b) => b.date.localeCompare(a.date)) };
  }).sort((a, b) => a.referenceMonth.localeCompare(b.referenceMonth));
  const currentReference = invoiceReferenceForPurchase(today, card);
  const usedLimit = fromCents(invoices.reduce((total, invoice) => total + toCents(invoice.remainingAmount), 0));
  return {
    cardId: card.id,
    currentReference,
    invoices,
    currentInvoice: invoices.find((invoice) => invoice.referenceMonth === currentReference),
    nextInvoice: invoices.find((invoice) => invoice.referenceMonth > currentReference),
    futureInvoices: invoices.filter((invoice) => invoice.referenceMonth > currentReference),
    usedLimit,
    availableLimit: fromCents(Math.max(0, toCents(card.limit) - toCents(usedLimit))),
  };
}

export function payCardInvoice(userId: string, cardId: string, referenceMonth: string, accountId: string, amountInput?: number, date = day()) {
  const card = mockDatabase.creditCards.find((item) => item.id === cardId && item.userId === userId);
  if (!card) throw new AppError(404, "CREDIT_CARD_NOT_FOUND", "Cartão não encontrado.");
  const invoice = cardInvoices(card).invoices.find((item) => item.referenceMonth === referenceMonth);
  if (!invoice || invoice.remainingAmount <= 0) throw new Error("Esta fatura não possui saldo pendente.");
  const account = mockDatabase.accounts.find((item) => item.id === accountId && item.userId === userId);
  if (!account) throw new AppError(404, "ACCOUNT_NOT_FOUND", "Conta não encontrada.");
  const amount = fromCents(toCents(amountInput ?? invoice.remainingAmount));
  if (toCents(amount) > toCents(invoice.remainingAmount)) throw new Error("O pagamento não pode superar o saldo da fatura.");
  if (toCents(amount) > toCents(accountBalance(account.id))) throw new Error("Saldo insuficiente nesta conta.");
  const createdAt = stamp();
  const transaction: Transaction = {
    id: crypto.randomUUID(), userId, type: "TRANSFER", nature: "CREDIT_CARD", financialScope: "PERSONAL",
    description: `Pagamento da fatura · ${card.name}`, amount, date, categoryId: "invoice-payment",
    accountId: account.id, sourceAccountId: account.id, destinationCreditCardId: card.id,
    invoiceReference: referenceMonth, paymentMethod: "TRANSFER", status: "PAID", recurrenceType: "SINGLE",
    createdAt, updatedAt: createdAt,
  };
  const payment: CreditCardInvoicePayment = {
    id: crypto.randomUUID(), userId, cardId, referenceMonth, amount, accountId: account.id,
    date, transactionId: transaction.id, createdAt,
  };
  mockDatabase.transactions.unshift(transaction);
  mockDatabase.invoicePayments.push(payment);
  return { transaction, payment, invoice: cardInvoices(card).invoices.find((item) => item.referenceMonth === referenceMonth)! };
}
