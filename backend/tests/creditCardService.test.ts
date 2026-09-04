import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mockDatabase } from "../src/data/mockDatabase.js";
import { accountBalance } from "../src/services/accountService.js";
import { cardInvoices, installmentSchedule, invoiceCycle, invoiceReferenceForPurchase, payCardInvoice } from "../src/services/creditCardService.js";
import { SEED_USER_IDS } from "../src/data/seedIds.js";

const card = () => mockDatabase.creditCards.find((item) => item.id === "card-main")!;
let transactionSnapshot = [...mockDatabase.transactions];
let paymentSnapshot = [...mockDatabase.invoicePayments];

beforeEach(() => {
  transactionSnapshot = [...mockDatabase.transactions];
  paymentSnapshot = [...mockDatabase.invoicePayments];
});
afterEach(() => {
  mockDatabase.transactions.splice(0, mockDatabase.transactions.length, ...transactionSnapshot);
  mockDatabase.invoicePayments.splice(0, mockDatabase.invoicePayments.length, ...paymentSnapshot);
});

describe("credit card invoice cycle", () => {
  it("assigns purchases around closing day to the correct due month", () => {
    expect(invoiceReferenceForPurchase("2026-09-04", card())).toBe("2026-09");
    expect(invoiceReferenceForPurchase("2026-09-05", card())).toBe("2026-10");
    expect(invoiceCycle("2026-09", card())).toEqual({ closingDate: "2026-09-04", dueDate: "2026-09-11" });
  });

  it("splits installments in cents and assigns one invoice per month", () => {
    const schedule = installmentSchedule(100, 3, "2026-09-05", card());
    expect(schedule.map((item) => item.amount)).toEqual([33.34, 33.33, 33.33]);
    expect(schedule.reduce((total, item) => total + Math.round(item.amount * 100), 0)).toBe(10_000);
    expect(schedule.map((item) => item.invoiceReference)).toEqual(["2026-10", "2026-11", "2026-12"]);
  });

  it("pays an invoice as a transfer and never duplicates the expense", () => {
    const expensesBefore = mockDatabase.transactions.filter((item) => item.type === "EXPENSE").length;
    const balanceBefore = accountBalance("main");
    const invoice = cardInvoices(card(), mockDatabase.transactions, mockDatabase.invoicePayments, "2026-09-04").currentInvoice!;
    const result = payCardInvoice(SEED_USER_IDS.joao, card().id, invoice.referenceMonth, "main", invoice.remainingAmount, "2026-09-04");

    expect(result.transaction).toMatchObject({ type: "TRANSFER", destinationCreditCardId: card().id, invoiceReference: invoice.referenceMonth });
    expect(mockDatabase.transactions.filter((item) => item.type === "EXPENSE")).toHaveLength(expensesBefore);
    expect(accountBalance("main")).toBe(Math.round((balanceBefore - invoice.remainingAmount) * 100) / 100);
    expect(result.invoice.status).toBe("PAID");
    expect(result.invoice.remainingAmount).toBe(0);
  });
});
