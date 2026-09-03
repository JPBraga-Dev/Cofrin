import type {
  Budget,
  BudgetInput,
  CardInput,
  CreditCard,
  DashboardData,
  Group,
  GroupBalance,
  GroupContribution,
  GroupContributionTransferResult,
  GroupExpense,
  GroupInput,
  GroupMember,
  GroupSummary,
  InvoiceSummary,
  Notification,
  Profile,
  FriendRequest,
  Conversation,
  ConversationMember,
  ConversationView,
  Message,
  PiggyBank,
  PiggyInput,
  Settlement,
  Transaction,
  TransactionInput,
  PiggyTransferResult,
} from "../types";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";
type ApiEnvelope<T> = { data: T; meta?: { total?: number } };
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => null)) as
    ApiEnvelope<T> | { error?: { code?: string; message?: string } } | null;
  if (!response.ok) {
    const error = payload && "error" in payload ? payload.error : undefined;
    throw new ApiError(
      error?.code ?? "REQUEST_FAILED",
      error?.message ?? "Não foi possível concluir a operação.",
    );
  }
  return (payload as ApiEnvelope<T>).data;
}
const body = (data: unknown) => JSON.stringify(data);

export const api = {
  dashboard: () => request<DashboardData>("/dashboard"),
  listAccounts: () => request<{ id: string; name: string; balance: number }[]>("/accounts"),
  listTransactions: () => request<Transaction[]>("/transactions"),
  getTransaction: (id: string) => request<Transaction>(`/transactions/${id}`),
  createTransaction: (data: TransactionInput) =>
    request<Transaction>("/transactions", { method: "POST", body: body(data) }),
  updateTransaction: (id: string, data: Partial<TransactionInput>) =>
    request<Transaction>(`/transactions/${id}`, {
      method: "PUT",
      body: body(data),
    }),
  deleteTransaction: (id: string) =>
    request<void>(`/transactions/${id}`, { method: "DELETE" }),
  listPiggyBanks: () => request<PiggyBank[]>("/piggy-banks"),
  getPiggyBank: (id: string) => request<PiggyBank>(`/piggy-banks/${id}`),
  createPiggyBank: (data: PiggyInput) =>
    request<PiggyBank>("/piggy-banks", { method: "POST", body: body(data) }),
  updatePiggyBank: (id: string, data: Partial<PiggyInput>) =>
    request<PiggyBank>(`/piggy-banks/${id}`, {
      method: "PUT",
      body: body(data),
    }),
  depositPiggyBank: (id: string, accountId: string, amount: number, description?: string) =>
    request<PiggyTransferResult>(`/piggy-banks/${id}/deposits`, {
      method: "POST",
      body: body({ accountId, amount, description }),
    }),
  withdrawPiggyBank: (id: string, accountId: string, amount: number, description?: string) =>
    request<PiggyTransferResult>(`/piggy-banks/${id}/withdrawals`, {
      method: "POST",
      body: body({ accountId, amount, description }),
    }),
  listGroups: () => request<Group[]>("/groups"),
  getGroup: (id: string) => request<Group>(`/groups/${id}`),
  createGroup: (data: GroupInput) =>
    request<Group>("/groups", { method: "POST", body: body(data) }),
  updateGroup: (id: string, data: Partial<GroupInput>) =>
    request<Group>(`/groups/${id}`, { method: "PUT", body: body(data) }),
  getGroupSummary: (id: string) =>
    request<GroupSummary>(`/groups/${id}/summary`),
  getMembers: (id: string) => request<GroupMember[]>(`/groups/${id}/members`),
  addMember: (
    id: string,
    data: Pick<GroupMember, "userId" | "name"> &
      Partial<Pick<GroupMember, "role" | "expectedContribution">>,
  ) =>
    request<GroupMember>(`/groups/${id}/members`, {
      method: "POST",
      body: body(data),
    }),
  getContributions: (id: string) =>
    request<GroupContribution[]>(`/groups/${id}/contributions`),
  addContribution: (
    id: string,
    data: Pick<GroupContribution, "sourceAccountId" | "amount"> &
      Partial<Pick<GroupContribution, "date">>,
  ) =>
    request<GroupContributionTransferResult>(`/groups/${id}/contributions`, {
      method: "POST",
      body: body(data),
    }),
  getExpenses: (id: string) =>
    request<GroupExpense[]>(`/groups/${id}/expenses`),
  addExpense: (
    id: string,
    data: Omit<GroupExpense, "id" | "groupId" | "splits" | "createdAt"> & {
      participants?: {
        userId: string;
        percentage?: number;
        shares?: number;
        amount?: number;
      }[];
    },
  ) =>
    request<GroupExpense>(`/groups/${id}/expenses`, {
      method: "POST",
      body: body(data),
    }),
  getBalances: (id: string) =>
    request<GroupBalance[]>(`/groups/${id}/balances`),
  getSettlements: (id: string) =>
    request<Settlement[]>(`/groups/${id}/settlements`),
  markSettlementPaid: (groupId: string, settlementId: string) =>
    request<Settlement>(`/groups/${groupId}/settlements/${settlementId}/pay`, {
      method: "PATCH",
    }),
  listBudgets: () => request<Budget[]>("/budgets"),
  createBudget: (data: BudgetInput) =>
    request<Budget>("/budgets", { method: "POST", body: body(data) }),
  updateBudget: (id: string, data: Partial<BudgetInput>) =>
    request<Budget>(`/budgets/${id}`, { method: "PUT", body: body(data) }),
  deleteBudget: (id: string) =>
    request<void>(`/budgets/${id}`, { method: "DELETE" }),
  listCreditCards: () => request<CreditCard[]>("/credit-cards"),
  createCreditCard: (data: CardInput) =>
    request<CreditCard>("/credit-cards", { method: "POST", body: body(data) }),
  getInvoices: (id: string) =>
    request<InvoiceSummary>(`/credit-cards/${id}/invoices`),
  listNotifications: () => request<Notification[]>("/notifications"),
  markNotificationRead: (id: string) =>
    request<Notification>(`/notifications/${id}/read`, { method: "PATCH" }),
  getMyProfile: () => request<Profile>("/profiles/me"),
  updateMyProfile: (data: Partial<Pick<Profile, "displayName" | "username" | "bio" | "avatarUrl">>) =>
    request<Profile>("/profiles/me", { method: "PATCH", body: body(data) }),
  usernameAvailability: (username: string) =>
    request<{ username: string; available: boolean; message?: string }>(`/profiles/username-availability?username=${encodeURIComponent(username)}`),
  searchUsers: (search: string) =>
    request<(Profile & { relationship: "NONE" | "SENT" | "RECEIVED" | "FRIENDS" })[]>(`/users?search=${encodeURIComponent(search)}`),
  getUser: (username: string) => request<Profile>(`/users/${encodeURIComponent(username)}`),
  listFriends: () => request<Profile[]>("/friends"),
  listFriendRequests: () => request<(FriendRequest & { profile: Profile; direction: "SENT" | "RECEIVED" })[]>("/friend-requests"),
  sendFriendRequest: (receiverId: string) => request<FriendRequest>("/friend-requests", { method: "POST", body: body({ receiverId }) }),
  cancelFriendRequest: (id: string) => request<FriendRequest>(`/friend-requests/${id}`, { method: "DELETE" }),
  acceptFriendRequest: (id: string) => request<FriendRequest>(`/friend-requests/${id}/accept`, { method: "PATCH" }),
  declineFriendRequest: (id: string) => request<FriendRequest>(`/friend-requests/${id}/decline`, { method: "PATCH" }),
  removeFriend: (userId: string) => request<void>(`/friends/${userId}`, { method: "DELETE" }),
  listConversations: () => request<ConversationView[]>("/conversations"),
  createDirectConversation: (userId: string) => request<Conversation>("/conversations/direct", { method: "POST", body: body({ userId }) }),
  listMessages: (id: string) => request<Message[]>(`/conversations/${id}/messages`),
  sendMessage: (id: string, content: string) => request<Message>(`/conversations/${id}/messages`, { method: "POST", body: body({ content }) }),
  markConversationRead: (id: string) => request<ConversationMember>(`/conversations/${id}/read`, { method: "PATCH" }),
  getGroupConversation: (groupId: string) => request<Conversation>(`/groups/${groupId}/conversation`),
};
