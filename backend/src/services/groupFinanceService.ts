import type {
  Group,
  GroupExpense,
  GroupExpenseSplit,
} from "../domain/types.js";
import {
  splitByPercentage,
  splitByShares,
  splitEvenly,
  splitManual,
} from "./financeRules.js";
import { profileById } from "./socialService.js";
import { fromCents, toCents } from "../domain/money.js";

export type SplitInput = {
  userId: string;
  percentage?: number;
  shares?: number;
  amount?: number;
};
export function createSplits(
  expenseId: string,
  amount: number,
  memberIds: string[],
  splitType: GroupExpense["splitType"],
  input: SplitInput[] = [],
): GroupExpenseSplit[] {
  const raw =
    splitType === "EQUAL"
      ? splitEvenly(amount, memberIds)
      : splitType === "PERCENTAGE"
        ? splitByPercentage(
            amount,
            input.map((x) => ({
              memberId: x.userId,
              percentage: x.percentage ?? 0,
            })),
          )
        : splitType === "SHARES"
          ? splitByShares(
              amount,
              input.map((x) => ({ memberId: x.userId, shares: x.shares ?? 0 })),
            )
          : splitManual(
              amount,
              input.map((x) => ({ memberId: x.userId, amount: x.amount ?? 0 })),
            );
  return raw.map((entry, index) => ({
    id: `${expenseId}-split-${index}`,
    expenseId,
    userId: entry.memberId,
    amount: entry.amount,
    percentage: input[index]?.percentage,
    shares: input[index]?.shares,
    status: "PENDING",
  }));
}
export function calculateGroupBalances(group: Group) {
  const balances = new Map(group.members.map((member) => [member.userId, 0]));
  for (const contribution of group.contributions) {
    if (contribution.status === "CONFIRMED")
      balances.set(
        contribution.userId,
        (balances.get(contribution.userId) ?? 0) + toCents(contribution.amount),
      );
  }
  for (const expense of group.expenses) {
    if (expense.paymentSource === "MEMBER")
      balances.set(
        expense.paidByUserId,
        (balances.get(expense.paidByUserId) ?? 0) + toCents(expense.amount),
      );
    for (const split of expense.splits)
      balances.set(
        split.userId,
        (balances.get(split.userId) ?? 0) - toCents(split.amount),
      );
  }
  return group.members.map((member) => ({
    userId: member.userId,
    name: profileById(member.userId)?.displayName ?? "Participante",
    balance: fromCents(balances.get(member.userId) ?? 0),
  }));
}
export function groupFund(group: Group) {
  const raised = toCents(group.initialFundAmount ?? 0) + group.contributions
    .filter((c) => c.status === "CONFIRMED")
    .reduce((total, c) => total + toCents(c.amount), 0);
  const paidFromFund = group.expenses
    .filter((e) => e.paymentSource === "GROUP_FUND")
    .reduce((total, e) => total + toCents(e.amount), 0);
  return fromCents(raised - paidFromFund);
}
