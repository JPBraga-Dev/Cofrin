import type { Request, Response } from "express";
import { mockDatabase } from "../data/mockDatabase.js";
import {
  budgetRepository,
  groupRepository,
  piggyBankRepository,
  transactionRepository,
} from "../repositories/mock.js";
import { calculateSettlements } from "../services/debtSettlementService.js";
import {
  calculateEstimatedCompletion,
  calculatePercentage,
  calculateSavingsRate,
} from "../services/financeRules.js";
import {
  calculateGroupBalances,
  groupFund,
} from "../services/groupFinanceService.js";
import { accountBalance, accountById, accountsWithBalances } from "../services/accountService.js";
import { registerGroupExpense, transferAccountToGroupFund, transferAccountToPiggy, transferPiggyToAccount } from "../services/transferService.js";
import {
  budgetSchema,
  creditCardSchema,
  invoicePaymentSchema,
  groupContributionSchema,
  groupExpenseSchema,
  groupMemberSchema,
  groupSchema,
  movementSchema,
  piggySchema,
  transactionSchema,
  friendRequestSchema,
  directConversationSchema,
  messageSchema,
} from "../validators/schemas.js";
import { notFound, ok } from "../utils/http.js";
import {
  acceptRequest,
  directConversation,
  ensureGroupConversation,
  listConversations as socialConversations,
  listFriends as socialFriends,
  listMessages as socialMessages,
  listRequests as socialRequests,
  markRead as socialMarkRead,
  profileById,
  profileByUsername,
  publicProfile,
  removeFriend,
  searchProfiles,
  sendMessage as socialSendMessage,
  sendRequest,
  setRequestStatus,
  updateOwnProfile,
  validateUsername,
} from "../services/socialService.js";
import { profileUpdateSchema, usernameCheckSchema } from "../validators/authSchemas.js";
import { safeIdentity } from "../services/authService.js";
import { AppError } from "../utils/appError.js";
import { fromCents, sumInCents } from "../domain/money.js";
import { cardInvoices, installmentSchedule, invoiceReferenceForPurchase, payCardInvoice } from "../services/creditCardService.js";
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const authUserId = (req: Request) => req.auth!.user.id;
const routeId = (req: Request) =>
  Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
const settlementsFor = (group: import("../domain/types.js").Group) => {
  const paid = new Map(group.settlements.map((item) => [item.id, item]));
  return calculateSettlements(calculateGroupBalances(group)).map((item) => {
    const id = `${item.fromUserId}-${item.toUserId}`;
    const previous = paid.get(id);
    return {
      ...item,
      id,
      groupId: group.id,
      status: previous?.status ?? "SUGGESTED",
      createdAt: previous?.createdAt,
      settledAt: previous?.settledAt,
    };
  });
};
const currentBudgetAmount = (userId: string, categoryId: string, referenceMonth?: string) =>
  mockDatabase.transactions
    .filter(
      (item) =>
        item.userId === userId &&
        item.type === "EXPENSE" &&
        item.financialScope !== "SHARED" &&
        item.categoryId === categoryId &&
        (!referenceMonth || item.date.startsWith(referenceMonth)),
    )
    .reduce((total, item) => total + item.amount, 0);
const presentGroup = (group: import("../domain/types.js").Group) => {
  const balances = new Map(
    calculateGroupBalances(group).map((item) => [item.userId, item.balance]),
  );
  return {
    ...group,
    members: group.members.map((member) => {
      const profile = profileById(member.userId);
      return {
        ...member,
        name: profile?.displayName ?? "Participante",
        username: profile?.username,
        avatarUrl: profile ? publicProfile(profile).avatarUrl : undefined,
        balance: balances.get(member.userId) ?? 0,
      };
    }),
    settlements: settlementsFor(group),
  };
};
export const health = (_: Request, res: Response) =>
  res.json({ status: "ok", service: "cofrin-api" });
export async function dashboard(req: Request, res: Response) {
  const userId = authUserId(req);
  const transactions = (await transactionRepository.list()).filter((item) => item.userId === userId);
  const personalTransactions = transactions.filter((item) => item.financialScope !== "SHARED");
  const incomeItems = personalTransactions.filter((t) => t.type === "INCOME");
  const expenseItems = personalTransactions.filter((t) => t.type === "EXPENSE");
  const obligationItems = expenseItems.filter((t) => t.status === "PENDING" || t.status === "OVERDUE");
  const income = fromCents(sumInCents(incomeItems.map((item) => item.amount)));
  const expenses = fromCents(sumInCents(expenseItems.map((item) => item.amount)));
  const committed = fromCents(sumInCents(obligationItems.map((item) => item.amount)));
  const accounts = accountsWithBalances(userId);
  return ok(res, {
    totalBalance: accounts.reduce((total, account) => total + account.balance, 0),
    income,
    expenses,
    committed,
    savingsRate: calculateSavingsRate(income, expenses),
    upcomingBills: obligationItems,
    accounts,
  });
}
export const listAccounts = (req: Request, res: Response) => ok(res, accountsWithBalances(authUserId(req)));
export function getAccount(req: Request, res: Response) {
  const account = mockDatabase.accounts.find((item) => item.id === routeId(req) && item.userId === authUserId(req));
  return account ? ok(res, { id: account.id, name: account.name, balance: accountBalance(account.id) }) : notFound(res, "Account");
}
export async function listTransactions(req: Request, res: Response) {
  const transactions = (await transactionRepository.list()).filter((item) => item.userId === authUserId(req));
  return ok(res, transactions, {
    total: transactions.length,
  });
}
export async function getTransaction(req: Request, res: Response) {
  const item = await transactionRepository.findById(routeId(req));
  return item?.userId === authUserId(req) ? ok(res, item) : notFound(res, "Transaction");
}
export async function createTransaction(req: Request, res: Response) {
  const value = transactionSchema.parse(req.body);
  if (value.type === "TRANSFER") throw new Error("Transferências devem informar origem e destino.");
  const userId = authUserId(req);
  if (value.paymentMethod !== "CREDIT" && accountById(value.accountId).userId !== userId) throw new AppError(404, "ACCOUNT_NOT_FOUND", "Conta não encontrada.");
  const creditCard = value.paymentMethod === "CREDIT" ? mockDatabase.creditCards.find((card) => card.id === value.accountId && card.userId === userId) : undefined;
  if (value.paymentMethod === "CREDIT" && !creditCard) throw new AppError(404, "CREDIT_CARD_NOT_FOUND", "Cartão não encontrado.");
  if (value.type === "EXPENSE" && value.paymentMethod !== "CREDIT" && value.amount > accountBalance(value.accountId)) throw new Error("Saldo insuficiente nesta conta.");
  const stamp = now();
  const base = {
    userId,
    nature: (creditCard ? "CREDIT_CARD" : "PERSONAL") as import("../domain/types.js").Transaction["nature"],
    financialScope: "PERSONAL" as const,
    status: value.type === "INCOME" ? "RECEIVED" as const : "PAID" as const,
    recurrenceType: value.recurrenceType ?? "SINGLE" as const,
    ...value,
    creditCardId: creditCard?.id,
    createdAt: stamp,
    updatedAt: stamp,
  };
  if (creditCard && value.type === "EXPENSE" && value.recurrenceType === "INSTALLMENT" && (value.installmentCount ?? 0) > 1) {
    const seriesId = id();
    const created: import("../domain/types.js").Transaction[] = [];
    try {
      for (const installment of installmentSchedule(value.amount, value.installmentCount!, value.date, creditCard))
        created.push(await transactionRepository.create({ ...base, id: id(), parentTransactionId: seriesId, ...installment }));
    } catch (cause) {
      for (const installment of created) await transactionRepository.delete(installment.id);
      throw cause;
    }
    return res.status(201).json({ data: created[0] });
  }
  const item = await transactionRepository.create({
    ...base,
    id: id(),
    invoiceReference: creditCard ? invoiceReferenceForPurchase(value.date, creditCard) : undefined,
  });
  return res.status(201).json({ data: item });
}
export async function updateTransaction(req: Request, res: Response) {
  const value = transactionSchema.partial().parse(req.body);
  const existing = await transactionRepository.findById(routeId(req));
  if (!existing || existing.userId !== authUserId(req)) return notFound(res, "Transaction");
  if (existing?.type === "TRANSFER" || value.type === "TRANSFER") throw new Error("Transferências internas não podem ser editadas como lançamento comum.");
  const next = { ...existing, ...value };
  if (next.paymentMethod !== "CREDIT") {
    if (accountById(next.accountId).userId !== authUserId(req)) return notFound(res, "Account");
    const projectedLedger = mockDatabase.transactions.map((transaction) =>
      transaction.id === existing.id ? next : transaction,
    );
    if (
      next.type === "EXPENSE" &&
      accountBalance(next.accountId, projectedLedger) < 0
    )
      throw new Error("Saldo insuficiente nesta conta.");
  } else if (!mockDatabase.creditCards.some((card) => card.id === next.accountId && card.userId === authUserId(req))) return notFound(res, "Credit card");
  const item = await transactionRepository.update(routeId(req), {
    ...value,
    updatedAt: now(),
  });
  return item ? ok(res, item) : notFound(res, "Transaction");
}
export async function removeTransaction(req: Request, res: Response) {
  const existing = await transactionRepository.findById(routeId(req));
  if (!existing || existing.userId !== authUserId(req)) return notFound(res, "Transaction");
  if (existing?.type === "TRANSFER") throw new Error("Transferências internas não podem ser removidas por esta tela.");
  return (await transactionRepository.delete(routeId(req)))
    ? res.status(204).send()
    : notFound(res, "Transaction");
}
export async function listPiggies(req: Request, res: Response) {
  return ok(res, (await piggyBankRepository.list()).filter((item) => item.userId === authUserId(req)));
}
export async function getPiggy(req: Request, res: Response) {
  const item = await piggyBankRepository.findById(routeId(req));
  if (!item || item.userId !== authUserId(req)) return notFound(res, "Piggy bank");
  return ok(res, {
    ...item,
    progress: calculatePercentage(item.currentAmount, item.targetAmount),
    forecast: calculateEstimatedCompletion(
      item.targetAmount,
      item.currentAmount,
      item.monthlyContribution ?? 0,
    ),
  });
}
export async function createPiggy(req: Request, res: Response) {
  const value = piggySchema.parse(req.body);
  const stamp = now();
  const item = await piggyBankRepository.create({
    id: id(),
    userId: authUserId(req),
    currentAmount: 0,
    status: "ACTIVE",
    movements: [],
    ...value,
    createdAt: stamp,
    updatedAt: stamp,
  });
  return res.status(201).json({ data: item });
}
export async function updatePiggy(req: Request, res: Response) {
  const existing = await piggyBankRepository.findById(routeId(req));
  if (!existing || existing.userId !== authUserId(req)) return notFound(res, "Piggy bank");
  const item = await piggyBankRepository.update(routeId(req), {
    ...piggySchema.partial().parse(req.body),
    updatedAt: now(),
  });
  return item ? ok(res, item) : notFound(res, "Piggy bank");
}
export async function movePiggy(req: Request, res: Response) {
  try {
    const movement = movementSchema.parse(req.body);
    const result = req.path.endsWith("deposits")
      ? transferAccountToPiggy(authUserId(req), routeId(req), movement.accountId, movement.amount, movement.date, movement.description)
      : transferPiggyToAccount(authUserId(req), routeId(req), movement.accountId, movement.amount, movement.date, movement.description);
    return ok(res, result);
  } catch (cause) {
    if (cause instanceof AppError) throw cause;
    return res.status(400).json({ error: { code: "TRANSFER_VALIDATION", message: cause instanceof Error ? cause.message : "Não foi possível concluir a transferência." } });
  }
}
export async function listGroups(req: Request, res: Response) {
  const userId = authUserId(req);
  return ok(res, (await groupRepository.list()).filter((group) => group.members.some((member) => member.userId === userId && member.status === "ACTIVE")).map(presentGroup));
}
export async function getGroup(req: Request, res: Response) {
  const item = await groupRepository.findById(routeId(req));
  return item?.members.some((member) => member.userId === authUserId(req) && member.status === "ACTIVE") ? ok(res, presentGroup(item)) : notFound(res, "Group");
}
export async function createGroup(req: Request, res: Response) {
  const userId = authUserId(req);
  const { participantUserIds = [userId], ...value } = groupSchema.parse(
    req.body,
  );
  const stamp = now();
  const groupId = id();
  const memberIds = [...new Set([userId, ...participantUserIds])];
  if (memberIds.some((memberId) => !profileById(memberId))) throw new AppError(422, "MEMBER_INVALID", "Um dos participantes não possui perfil.");
  const item = await groupRepository.create({
    id: groupId,
    ownerId: userId,
    status: "ACTIVE",
    members: memberIds.map((userId) => ({
      id: id(),
      groupId,
      userId,
      role: userId === authUserId(req) ? "OWNER" : "MEMBER",
      expectedContribution: 0,
      joinedAt: stamp,
      status: "ACTIVE" as const,
      balance: 0,
    })),
    contributions: [],
    expenses: [],
    settlements: [],
    ...value,
    createdAt: stamp,
    updatedAt: stamp,
  });
  ensureGroupConversation(item.id, userId);
  return res.status(201).json({ data: presentGroup(item) });
}
export async function updateGroup(req: Request, res: Response) {
  const group = await groupRepository.findById(routeId(req));
  const actor = group?.members.find((member) => member.userId === authUserId(req) && member.status === "ACTIVE");
  if (!group || !actor) return notFound(res, "Group");
  if (!(["OWNER", "ADMIN"] as const).includes(actor.role as "OWNER" | "ADMIN")) throw new AppError(403, "FORBIDDEN", "Você não pode alterar este grupo.");
  const { participantUserIds: _participantUserIds, ...value } = groupSchema.partial().parse(req.body);
  const item = await groupRepository.update(routeId(req), {
    ...value,
    updatedAt: now(),
  });
  return item ? ok(res, presentGroup(item)) : notFound(res, "Group");
}
export async function groupMembers(req: Request, res: Response) {
  const item = await groupRepository.findById(routeId(req));
  return item?.members.some((member) => member.userId === authUserId(req) && member.status === "ACTIVE") ? ok(res, presentGroup(item).members) : notFound(res, "Group");
}
export async function addGroupMember(req: Request, res: Response) {
  const group = await groupRepository.findById(routeId(req));
  if (!group) return notFound(res, "Group");
  const actor = group.members.find((member) => member.userId === authUserId(req) && member.status === "ACTIVE");
  if (!actor) return notFound(res, "Group");
  if (actor.role !== "OWNER" && actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN", "Você não pode gerenciar membros.");
  const value = groupMemberSchema.parse(req.body);
  if (!profileById(value.userId)) throw new AppError(422, "MEMBER_INVALID", "Pessoa não encontrada.");
  if (group.members.some((member) => member.userId === value.userId))
    return res.status(409).json({
      error: {
        code: "CONFLICT",
        message: "Member already belongs to this group.",
      },
    });
  const member = {
    id: id(),
    groupId: group.id,
    joinedAt: now(),
    status: "ACTIVE" as const,
    balance: 0,
    ...value,
  };
  await groupRepository.update(group.id, {
    members: [...group.members, member],
    updatedAt: now(),
  });
  const profile = profileById(member.userId);
  return res.status(201).json({ data: { ...member, name: profile?.displayName ?? "Participante", username: profile?.username, avatarUrl: profile ? publicProfile(profile).avatarUrl : undefined } });
}
export async function groupContributions(req: Request, res: Response) {
  const group = await groupRepository.findById(routeId(req));
  return group?.members.some((member) => member.userId === authUserId(req) && member.status === "ACTIVE") ? ok(res, group.contributions) : notFound(res, "Group");
}
export async function addGroupContribution(req: Request, res: Response) {
  try {
    const value = groupContributionSchema.parse(req.body);
    const result = transferAccountToGroupFund(authUserId(req), routeId(req), value.sourceAccountId, value.amount, value.date);
    return res.status(201).json({ data: { ...result, group: presentGroup(result.group) } });
  } catch (cause) {
    if (cause instanceof AppError) throw cause;
    return res.status(400).json({ error: { code: "TRANSFER_VALIDATION", message: cause instanceof Error ? cause.message : "Não foi possível registrar a contribuição." } });
  }
}
export async function groupExpenses(req: Request, res: Response) {
  const group = await groupRepository.findById(routeId(req));
  return group?.members.some((member) => member.userId === authUserId(req) && member.status === "ACTIVE") ? ok(res, group.expenses) : notFound(res, "Group");
}
export async function addGroupExpense(req: Request, res: Response) {
  try {
    const value = groupExpenseSchema.parse(req.body);
    const result = registerGroupExpense(authUserId(req), routeId(req), value);
    return res.status(201).json({ data: { ...result, group: presentGroup(result.group) } });
  } catch (cause) {
    if (cause instanceof AppError) throw cause;
    return res.status(400).json({ error: { code: "GROUP_EXPENSE_VALIDATION", message: cause instanceof Error ? cause.message : "Não foi possível registrar a despesa." } });
  }
}
export async function groupBalances(req: Request, res: Response) {
  const group = await groupRepository.findById(routeId(req));
  return group?.members.some((member) => member.userId === authUserId(req) && member.status === "ACTIVE")
    ? ok(res, calculateGroupBalances(group))
    : notFound(res, "Group");
}
export async function groupSettlements(req: Request, res: Response) {
  const group = await groupRepository.findById(routeId(req));
  return group?.members.some((member) => member.userId === authUserId(req) && member.status === "ACTIVE") ? ok(res, settlementsFor(group)) : notFound(res, "Group");
}
export async function markSettlementPaid(req: Request, res: Response) {
  const group = await groupRepository.findById(routeId(req));
  if (!group || !group.members.some((member) => member.userId === authUserId(req) && member.status === "ACTIVE")) return notFound(res, "Group");
  const settlement = settlementsFor(group).find(
    (item) => item.id === req.params.settlementId,
  );
  if (!settlement) return notFound(res, "Settlement");
  if (settlement.fromUserId !== authUserId(req)) throw new AppError(403, "FORBIDDEN", "Somente quem deve pode confirmar este acerto.");
  const paid = { ...settlement, status: "PAID" as const, settledAt: now() };
  await groupRepository.update(group.id, {
    settlements: [
      ...group.settlements.filter((item) => item.id !== paid.id),
      paid,
    ],
    updatedAt: now(),
  });
  return ok(res, paid);
}
export async function groupSummary(req: Request, res: Response) {
  const group = await groupRepository.findById(routeId(req));
  if (!group || !group.members.some((member) => member.userId === authUserId(req) && member.status === "ACTIVE")) return notFound(res, "Group");
  const balances = calculateGroupBalances(group);
  return ok(res, {
    group: presentGroup(group),
    fund: groupFund(group),
    totalContributed: group.contributions
      .filter((c) => c.status === "CONFIRMED")
      .reduce((total, c) => total + c.amount, 0),
    totalExpenses: group.expenses.reduce((total, e) => total + e.amount, 0),
    balances,
    settlements: settlementsFor(group),
  });
}
export async function listBudgets(req: Request, res: Response) {
  const userId = authUserId(req);
  const budgets = (await budgetRepository.list()).filter((budget) => budget.userId === userId);
  return ok(
    res,
    budgets.map((budget) => ({
      ...budget,
      currentAmount: currentBudgetAmount(userId, budget.categoryId, budget.referenceMonth),
    })),
  );
}
export async function getBudget(req: Request, res: Response) {
  const budget = await budgetRepository.findById(routeId(req));
  return budget?.userId === authUserId(req)
    ? ok(res, {
        ...budget,
        currentAmount: currentBudgetAmount(authUserId(req), budget.categoryId, budget.referenceMonth),
      })
    : notFound(res, "Budget");
}
export async function createBudget(req: Request, res: Response) {
  const value = budgetSchema.parse(req.body);
  const stamp = now();
  const item = await budgetRepository.create({
    id: id(),
    userId: authUserId(req),
    currentAmount: 0,
    ...value,
    createdAt: stamp,
    updatedAt: stamp,
  });
  return res.status(201).json({
    data: {
      ...item,
      currentAmount: currentBudgetAmount(authUserId(req), item.categoryId, item.referenceMonth),
    },
  });
}
export async function updateBudget(req: Request, res: Response) {
  const existing = await budgetRepository.findById(routeId(req));
  if (!existing || existing.userId !== authUserId(req)) return notFound(res, "Budget");
  const item = await budgetRepository.update(routeId(req), {
    ...budgetSchema.partial().parse(req.body),
    updatedAt: now(),
  });
  return item
    ? ok(res, {
        ...item,
        currentAmount: currentBudgetAmount(authUserId(req), item.categoryId, item.referenceMonth),
      })
    : notFound(res, "Budget");
}
export async function removeBudget(req: Request, res: Response) {
  const existing = await budgetRepository.findById(routeId(req));
  if (!existing || existing.userId !== authUserId(req)) return notFound(res, "Budget");
  return (await budgetRepository.delete(routeId(req)))
    ? res.status(204).send()
    : notFound(res, "Budget");
}
export const listCards = (req: Request, res: Response) =>
  ok(res, mockDatabase.creditCards.filter((card) => card.userId === authUserId(req)));
export const createCard = (req: Request, res: Response) => {
  const value = creditCardSchema.parse(req.body);
  const item = {
    id: id(),
    userId: authUserId(req),
    color: "carbon",
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
    ...value,
  };
  mockDatabase.creditCards.push(item);
  return res.status(201).json({ data: item });
};
export const invoices = (req: Request, res: Response) => {
  const cardId = routeId(req);
  const card = mockDatabase.creditCards.find((item) => item.id === cardId && item.userId === authUserId(req));
  return card ? ok(res, cardInvoices(card)) : notFound(res, "Credit card");
};
export const payInvoice = (req: Request, res: Response) => {
  try {
    const rawReference = Array.isArray(req.params.referenceMonth) ? req.params.referenceMonth[0] : req.params.referenceMonth;
    const value = invoicePaymentSchema.parse({ ...req.body, referenceMonth: rawReference });
    return res.status(201).json({ data: payCardInvoice(authUserId(req), routeId(req), value.referenceMonth, value.accountId, value.amount, value.date) });
  } catch (cause) {
    if (cause instanceof AppError) throw cause;
    return res.status(400).json({ error: { code: "INVOICE_PAYMENT_VALIDATION", message: cause instanceof Error ? cause.message : "Não foi possível pagar a fatura." } });
  }
};
export const listNotifications = (req: Request, res: Response) =>
  ok(res, mockDatabase.notifications.filter((item) => item.userId === authUserId(req)));
export const readNotification = (req: Request, res: Response) => {
  const item = mockDatabase.notifications.find((n) => n.id === routeId(req) && n.userId === authUserId(req));
  if (!item) return notFound(res, "Notification");
  item.read = true;
  return ok(res, item);
};
const socialError = (res: Response, cause: unknown) =>
  cause instanceof AppError ? (() => { throw cause; })() : res.status(400).json({ error: { code: "SOCIAL_VALIDATION", message: cause instanceof Error ? cause.message : "Não foi possível concluir esta ação." } });
export const getMyProfile = async (req: Request, res: Response) => ok(res, await safeIdentity(authUserId(req), true));
export const patchMyProfile = async (req: Request, res: Response) => {
  const value = profileUpdateSchema.parse(req.body);
  await updateOwnProfile(authUserId(req), value);
  return ok(res, await safeIdentity(authUserId(req), true));
};
export const usernameAvailability = async (req: Request, res: Response) => {
  const raw = usernameCheckSchema.parse({ username: req.query.username }).username;
  try { const username = await validateUsername(raw, req.auth?.user.id); return ok(res, { username, available: true }); } catch (cause) { return ok(res, { username: raw, available: false, message: cause instanceof Error ? cause.message : "Indisponível" }); }
};
export const listUsers = (req: Request, res: Response) => ok(res, searchProfiles(authUserId(req), String(req.query.search ?? "")));
export const getUser = (req: Request, res: Response) => { const username = Array.isArray(req.params.username) ? req.params.username[0] : req.params.username; const profile = profileByUsername(username ?? ""); return profile ? ok(res, publicProfile(profile)) : notFound(res, "User"); };
export const listFriends = (req: Request, res: Response) => ok(res, socialFriends(authUserId(req)));
export const listFriendRequests = (req: Request, res: Response) => ok(res, socialRequests(authUserId(req)));
export const createFriendRequest = (req: Request, res: Response) => { try { const value = friendRequestSchema.parse(req.body); return res.status(201).json({ data: sendRequest(authUserId(req), value.receiverId) }); } catch (cause) { return socialError(res, cause); } };
export const acceptFriendRequest = (req: Request, res: Response) => { try { return ok(res, acceptRequest(authUserId(req), routeId(req))); } catch (cause) { return socialError(res, cause); } };
export const declineFriendRequest = (req: Request, res: Response) => { try { return ok(res, setRequestStatus(authUserId(req), routeId(req), "DECLINED")); } catch (cause) { return socialError(res, cause); } };
export const cancelFriendRequest = (req: Request, res: Response) => { try { return ok(res, setRequestStatus(authUserId(req), routeId(req), "CANCELLED")); } catch (cause) { return socialError(res, cause); } };
export const deleteFriend = (req: Request, res: Response) => { try { removeFriend(authUserId(req), routeId(req)); return res.status(204).send(); } catch (cause) { return socialError(res, cause); } };
export const listConversations = (req: Request, res: Response) => ok(res, socialConversations(authUserId(req)));
export const createDirectConversation = (req: Request, res: Response) => { try { const value = directConversationSchema.parse(req.body); return res.status(201).json({ data: directConversation(authUserId(req), value.userId) }); } catch (cause) { return socialError(res, cause); } };
export const messagesForConversation = (req: Request, res: Response) => ok(res, socialMessages(authUserId(req), routeId(req)));
export const createMessage = (req: Request, res: Response) => { try { const value = messageSchema.parse(req.body); return res.status(201).json({ data: socialSendMessage(authUserId(req), routeId(req), value.content) }); } catch (cause) { return socialError(res, cause); } };
export const markConversationRead = (req: Request, res: Response) => { try { return ok(res, socialMarkRead(authUserId(req), routeId(req))); } catch (cause) { return socialError(res, cause); } };
export const groupConversation = (req: Request, res: Response) => { try { return ok(res, ensureGroupConversation(routeId(req), authUserId(req))); } catch (cause) { return socialError(res, cause); } };
