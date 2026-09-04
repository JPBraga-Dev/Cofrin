import { z } from "zod";
export const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  description: z.string().trim().min(1),
  amount: z.number().positive(),
  date: z.string().date(),
  categoryId: z.string().min(1),
  accountId: z.string().min(1),
  paymentMethod: z.string().min(1),
  status: z.enum(["PAID", "RECEIVED", "PENDING", "OVERDUE"]).optional(),
  nature: z
    .enum([
      "PERSONAL",
      "CREDIT_CARD",
      "GROUP",
      "PIGGY_BANK",
      "ACCOUNT_TRANSFER",
    ])
    .optional(),
  recurrenceType: z.enum(["SINGLE", "RECURRING", "INSTALLMENT"]).optional(),
  installmentCount: z.number().int().min(2).max(60).optional(),
  installmentNumber: z.number().int().positive().optional(),
  creditCardId: z.string().min(1).optional(),
  notes: z.string().optional(),
});
export const piggySchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  targetAmount: z.number().positive(),
  monthlyContribution: z.number().nonnegative().optional(),
  deadline: z.string().date().optional(),
  icon: z.string().optional(),
});
export const movementSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().date().optional(),
  description: z.string().optional(),
});
export const groupSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  type: z.enum(["TRIP", "EVENT", "HOUSE", "GIFT", "COUPLE", "GOAL", "OTHER"]),
  targetAmount: z.number().positive().optional(),
  eventDate: z.string().date().optional(),
  participantUserIds: z.array(z.string().min(1)).min(1).optional(),
});
export const groupMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).default("MEMBER"),
  expectedContribution: z.number().nonnegative().default(0),
});
export const friendRequestSchema = z.object({ receiverId: z.string().uuid() });
export const directConversationSchema = z.object({ userId: z.string().uuid() });
export const messageSchema = z.object({ content: z.string().trim().min(1).max(2000) });
export const groupContributionSchema = z.object({
  sourceAccountId: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().date().optional(),
});
export const groupExpenseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  paidByUserId: z.string().min(1),
  date: z.string().date().optional(),
  category: z.string().min(1),
  splitType: z
    .enum(["EQUAL", "PERCENTAGE", "SHARES", "MANUAL"])
    .default("EQUAL"),
  paymentSource: z.enum(["GROUP_FUND", "MEMBER"]).default("MEMBER"),
  sourceAccountId: z.string().min(1).optional(),
  notes: z.string().optional(),
  participants: z
    .array(
      z.object({
        userId: z.string().min(1),
        percentage: z.number().nonnegative().optional(),
        shares: z.number().positive().optional(),
        amount: z.number().positive().optional(),
      }),
    )
    .min(1)
    .optional(),
});
export const budgetSchema = z.object({
  categoryId: z.string().min(1),
  limitAmount: z.number().positive(),
  period: z.enum(["MONTHLY", "WEEKLY", "CUSTOM"]).default("MONTHLY"),
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});
export const creditCardSchema = z.object({
  name: z.string().min(1),
  brand: z.string().min(1),
  lastFourDigits: z.string().regex(/^\d{4}$/),
  limit: z.number().positive(),
  closingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  color: z.string().optional(),
});
export const invoicePaymentSchema = z.object({
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
  accountId: z.string().min(1),
  amount: z.number().positive().optional(),
  date: z.string().date().optional(),
});
