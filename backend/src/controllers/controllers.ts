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
  createSplits,
  groupFund,
} from "../services/groupFinanceService.js";
import { accountBalance, accountById, accountsWithBalances } from "../services/accountService.js";
import { transferAccountToGroupFund, transferAccountToPiggy, transferPiggyToAccount } from "../services/transferService.js";
import {
  budgetSchema,
  creditCardSchema,
  groupContributionSchema,
  groupExpenseSchema,
  groupMemberSchema,
  groupSchema,
  movementSchema,
  piggySchema,
  transactionSchema,
} from "../validators/schemas.js";
import { notFound, ok } from "../utils/http.js";
import {
  acceptRequest,
  CURRENT_USER_ID,
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
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const demoMembers: Record<string, string> = {
  "u-joao": "João Braga",
  "u-maria": "Maria Silva",
  "u-lucas": "Lucas Costa",
};
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
const currentBudgetAmount = (categoryId: string, referenceMonth?: string) =>
  mockDatabase.transactions
    .filter(
      (item) =>
        item.type === "EXPENSE" &&
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
    members: group.members.map((member) => ({
      ...member,
      balance: balances.get(member.userId) ?? 0,
    })),
    settlements: settlementsFor(group),
  };
};
export const health = (_: Request, res: Response) =>
  res.json({ status: "ok", service: "cofrin-api" });
export async function dashboard(_: Request, res: Response) {
  const transactions = await transactionRepository.list();
  const income = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((a, t) => a + t.amount, 0);
  const expenses = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((a, t) => a + t.amount, 0);
  const committed = transactions
    .filter((t) => t.status === "PENDING")
    .reduce((total, item) => total + item.amount, 0);
  const accounts = accountsWithBalances();
  return ok(res, {
    totalBalance: accounts.reduce((total, account) => total + account.balance, 0),
    income,
    expenses,
    committed,
    savingsRate: calculateSavingsRate(income, expenses),
    upcomingBills: transactions.filter((t) => t.status === "PENDING"),
    accounts,
  });
}
export const listAccounts = (_: Request, res: Response) => ok(res, accountsWithBalances());
export async function listTransactions(_: Request, res: Response) {
  return ok(res, await transactionRepository.list(), {
    total: mockDatabase.transactions.length,
  });
}
export async function getTransaction(req: Request, res: Response) {
  const item = await transactionRepository.findById(routeId(req));
  return item ? ok(res, item) : notFound(res, "Transaction");
}
export async function createTransaction(req: Request, res: Response) {
  const value = transactionSchema.parse(req.body);
  if (value.type === "TRANSFER") throw new Error("Transferências devem informar origem e destino.");
  if (value.paymentMethod !== "CREDIT") accountById(value.accountId);
  if (value.type === "EXPENSE" && value.paymentMethod !== "CREDIT" && value.amount > accountBalance(value.accountId)) throw new Error("Saldo insuficiente nesta conta.");
  const stamp = now();
  const item = await transactionRepository.create({
    id: id(),
    userId: "u-joao",
    nature: "PERSONAL",
    status: value.type === "INCOME" ? "RECEIVED" : "PAID",
    recurrenceType: "SINGLE",
    ...value,
    createdAt: stamp,
    updatedAt: stamp,
  });
  return res.status(201).json({ data: item });
}
export async function updateTransaction(req: Request, res: Response) {
  const value = transactionSchema.partial().parse(req.body);
  const existing = await transactionRepository.findById(routeId(req));
  if (existing?.type === "TRANSFER" || value.type === "TRANSFER") throw new Error("Transferências internas não podem ser editadas como lançamento comum.");
  const item = await transactionRepository.update(routeId(req), {
    ...value,
    updatedAt: now(),
  });
  return item ? ok(res, item) : notFound(res, "Transaction");
}
export async function removeTransaction(req: Request, res: Response) {
  const existing = await transactionRepository.findById(routeId(req));
  if (existing?.type === "TRANSFER") throw new Error("Transferências internas não podem ser removidas por esta tela.");
  return (await transactionRepository.delete(routeId(req)))
    ? res.status(204).send()
    : notFound(res, "Transaction");
}
export async function listPiggies(_: Request, res: Response) {
  return ok(res, await piggyBankRepository.list());
}
export async function getPiggy(req: Request, res: Response) {
  const item = await piggyBankRepository.findById(routeId(req));
  if (!item) return notFound(res, "Piggy bank");
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
    userId: "u-joao",
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
      ? transferAccountToPiggy(routeId(req), movement.accountId, movement.amount, movement.date, movement.description)
      : transferPiggyToAccount(routeId(req), movement.accountId, movement.amount, movement.date, movement.description);
    return ok(res, result);
  } catch (cause) {
    return res.status(400).json({ error: { code: "TRANSFER_VALIDATION", message: cause instanceof Error ? cause.message : "Não foi possível concluir a transferência." } });
  }
}
export async function listGroups(_: Request, res: Response) {
  return ok(res, (await groupRepository.list()).map(presentGroup));
}
export async function getGroup(req: Request, res: Response) {
  const item = await groupRepository.findById(routeId(req));
  return item ? ok(res, presentGroup(item)) : notFound(res, "Group");
}
export async function createGroup(req: Request, res: Response) {
  const { participantUserIds = ["u-joao"], ...value } = groupSchema.parse(
    req.body,
  );
  const stamp = now();
  const groupId = id();
  const memberIds = [...new Set(["u-joao", ...participantUserIds])];
  const item = await groupRepository.create({
    id: groupId,
    ownerId: "u-joao",
    status: "ACTIVE",
    members: memberIds.map((userId) => ({
      id: id(),
      groupId,
      userId,
      name: profileById(userId)?.displayName ?? demoMembers[userId] ?? "Participante",
      role: userId === "u-joao" ? "OWNER" : "MEMBER",
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
  ensureGroupConversation(item.id);
  return res.status(201).json({ data: item });
}
export async function updateGroup(req: Request, res: Response) {
  const item = await groupRepository.update(routeId(req), {
    ...groupSchema.partial().parse(req.body),
    updatedAt: now(),
  });
  return item ? ok(res, item) : notFound(res, "Group");
}
export async function groupMembers(req: Request, res: Response) {
  const item = await groupRepository.findById(routeId(req));
  return item ? ok(res, item.members) : notFound(res, "Group");
}
export async function addGroupMember(req: Request, res: Response) {
  const group = await groupRepository.findById(routeId(req));
  if (!group) return notFound(res, "Group");
  const value = groupMemberSchema.parse(req.body);
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
  return res.status(201).json({ data: member });
}
export async function groupContributions(req: Request, res: Response) {
  const group = await groupRepository.findById(routeId(req));
  return group ? ok(res, group.contributions) : notFound(res, "Group");
}
export async function addGroupContribution(req: Request, res: Response) {
  try {
    const value = groupContributionSchema.parse(req.body);
    const result = transferAccountToGroupFund(routeId(req), value.sourceAccountId, value.amount, value.date);
    return res.status(201).json({ data: result });
  } catch (cause) {
    return res.status(400).json({ error: { code: "TRANSFER_VALIDATION", message: cause instanceof Error ? cause.message : "Não foi possível registrar a contribuição." } });
  }
}
export async function groupExpenses(req: Request, res: Response) {
  const group = await groupRepository.findById(routeId(req));
  return group ? ok(res, group.expenses) : notFound(res, "Group");
}
export async function addGroupExpense(req: Request, res: Response) {
  const group = await groupRepository.findById(routeId(req));
  if (!group) return notFound(res, "Group");
  const value = groupExpenseSchema.parse(req.body);
  if (!group.members.some((member) => member.userId === value.paidByUserId))
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Payer is not an active group member.",
      },
    });
  const expenseId = id();
  const participants =
    value.participants ??
    group.members
      .filter((member) => member.status === "ACTIVE")
      .map((member) => ({ userId: member.userId }));
  const expense = {
    id: expenseId,
    groupId: group.id,
    description: value.description,
    amount: value.amount,
    paidByUserId: value.paidByUserId,
    date: value.date ?? new Date().toISOString().slice(0, 10),
    category: value.category,
    splitType: value.splitType,
    paymentSource: value.paymentSource,
    notes: value.notes,
    splits: createSplits(
      expenseId,
      value.amount,
      participants.map((item) => item.userId),
      value.splitType,
      participants,
    ),
    createdAt: now(),
  };
  await groupRepository.update(group.id, {
    expenses: [...group.expenses, expense],
    updatedAt: now(),
  });
  return res.status(201).json({ data: expense });
}
export async function groupBalances(req: Request, res: Response) {
  const group = await groupRepository.findById(routeId(req));
  return group
    ? ok(res, calculateGroupBalances(group))
    : notFound(res, "Group");
}
export async function groupSettlements(req: Request, res: Response) {
  const group = await groupRepository.findById(routeId(req));
  return group ? ok(res, settlementsFor(group)) : notFound(res, "Group");
}
export async function markSettlementPaid(req: Request, res: Response) {
  const group = await groupRepository.findById(routeId(req));
  if (!group) return notFound(res, "Group");
  const settlement = settlementsFor(group).find(
    (item) => item.id === req.params.settlementId,
  );
  if (!settlement) return notFound(res, "Settlement");
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
  if (!group) return notFound(res, "Group");
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
export async function listBudgets(_: Request, res: Response) {
  const budgets = await budgetRepository.list();
  return ok(
    res,
    budgets.map((budget) => ({
      ...budget,
      currentAmount: currentBudgetAmount(budget.categoryId, budget.referenceMonth),
    })),
  );
}
export async function createBudget(req: Request, res: Response) {
  const value = budgetSchema.parse(req.body);
  const stamp = now();
  const item = await budgetRepository.create({
    id: id(),
    userId: "u-joao",
    currentAmount: 0,
    ...value,
    createdAt: stamp,
    updatedAt: stamp,
  });
  return res.status(201).json({
    data: {
      ...item,
      currentAmount: currentBudgetAmount(item.categoryId, item.referenceMonth),
    },
  });
}
export async function updateBudget(req: Request, res: Response) {
  const item = await budgetRepository.update(routeId(req), {
    ...budgetSchema.partial().parse(req.body),
    updatedAt: now(),
  });
  return item
    ? ok(res, {
        ...item,
        currentAmount: currentBudgetAmount(item.categoryId, item.referenceMonth),
      })
    : notFound(res, "Budget");
}
export async function removeBudget(req: Request, res: Response) {
  return (await budgetRepository.delete(routeId(req)))
    ? res.status(204).send()
    : notFound(res, "Budget");
}
export const listCards = (_: Request, res: Response) =>
  ok(res, mockDatabase.creditCards);
export const createCard = (req: Request, res: Response) => {
  const value = creditCardSchema.parse(req.body);
  const item = {
    id: id(),
    userId: "u-joao",
    color: "#a78bfa",
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
  const currentInvoice = mockDatabase.transactions
    .filter(
      (item) =>
        item.type === "EXPENSE" &&
        (item.creditCardId === cardId || item.accountId === cardId),
    )
    .reduce((total, item) => total + item.amount, 0);
  return ok(res, { currentInvoice, nextInvoice: 0, futureInvoices: [] });
};
export const listNotifications = (_: Request, res: Response) =>
  ok(res, mockDatabase.notifications.filter((item) => item.userId === "u-joao"));
export const readNotification = (req: Request, res: Response) => {
  const item = mockDatabase.notifications.find((n) => n.id === routeId(req));
  if (!item) return notFound(res, "Notification");
  item.read = true;
  return ok(res, item);
};
const socialError = (res: Response, cause: unknown) =>
  res.status(400).json({ error: { code: "SOCIAL_VALIDATION", message: cause instanceof Error ? cause.message : "Não foi possível concluir esta ação." } });
export const getMyProfile = (_: Request, res: Response) => ok(res, profileById(CURRENT_USER_ID)!);
export const patchMyProfile = (req: Request, res: Response) => {
  try { return ok(res, updateOwnProfile(req.body)); } catch (cause) { return socialError(res, cause); }
};
export const usernameAvailability = (req: Request, res: Response) => {
  try { const username = validateUsername(String(req.query.username ?? ""), CURRENT_USER_ID); return ok(res, { username, available: true }); } catch (cause) { return ok(res, { username: String(req.query.username ?? ""), available: false, message: cause instanceof Error ? cause.message : "Indisponível" }); }
};
export const listUsers = (req: Request, res: Response) => ok(res, searchProfiles(String(req.query.search ?? "")));
export const getUser = (req: Request, res: Response) => { const username = Array.isArray(req.params.username) ? req.params.username[0] : req.params.username; const profile = profileByUsername(username ?? ""); return profile ? ok(res, publicProfile(profile)) : notFound(res, "User"); };
export const listFriends = (_: Request, res: Response) => ok(res, socialFriends());
export const listFriendRequests = (_: Request, res: Response) => ok(res, socialRequests());
export const createFriendRequest = (req: Request, res: Response) => { try { return res.status(201).json({ data: sendRequest(String(req.body.receiverId)) }); } catch (cause) { return socialError(res, cause); } };
export const acceptFriendRequest = (req: Request, res: Response) => { try { return ok(res, acceptRequest(routeId(req))); } catch (cause) { return socialError(res, cause); } };
export const declineFriendRequest = (req: Request, res: Response) => { try { return ok(res, setRequestStatus(routeId(req), "DECLINED")); } catch (cause) { return socialError(res, cause); } };
export const cancelFriendRequest = (req: Request, res: Response) => { try { return ok(res, setRequestStatus(routeId(req), "CANCELLED")); } catch (cause) { return socialError(res, cause); } };
export const deleteFriend = (req: Request, res: Response) => { try { removeFriend(routeId(req)); return res.status(204).send(); } catch (cause) { return socialError(res, cause); } };
export const listConversations = (_: Request, res: Response) => ok(res, socialConversations());
export const createDirectConversation = (req: Request, res: Response) => { try { return res.status(201).json({ data: directConversation(String(req.body.userId)) }); } catch (cause) { return socialError(res, cause); } };
export const messagesForConversation = (req: Request, res: Response) => ok(res, socialMessages(routeId(req)));
export const createMessage = (req: Request, res: Response) => { try { return res.status(201).json({ data: socialSendMessage(routeId(req), String(req.body.content ?? "")) }); } catch (cause) { return socialError(res, cause); } };
export const markConversationRead = (req: Request, res: Response) => { try { return ok(res, socialMarkRead(routeId(req))); } catch (cause) { return socialError(res, cause); } };
export const groupConversation = (req: Request, res: Response) => { try { return ok(res, ensureGroupConversation(routeId(req))); } catch (cause) { return socialError(res, cause); } };
