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
  GroupExpenseResult,
  GroupInput,
  GroupMember,
  GroupSummary,
  InvoiceSummary,
  InvoicePaymentResult,
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
  AuthSession,
} from "../types";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";
type ApiEnvelope<T> = { data: T; meta?: { total?: number } };
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${baseUrl}${path}`, {
    credentials: "include",
    headers: { ...(!isFormData ? { "Content-Type": "application/json" } : {}), ...options.headers },
    ...options,
  });
  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => null)) as
    ApiEnvelope<T> | { error?: { code?: string; message?: string } } | null;
  if (!response.ok) {
    const error = payload && "error" in payload ? payload.error : undefined;
    throw new ApiError(
      response.status,
      error?.code ?? "REQUEST_FAILED",
      error?.message ?? "Não foi possível concluir a operação.",
    );
  }
  return (payload as ApiEnvelope<T>).data;
}
const body = (data: unknown) => JSON.stringify(data);

export const api = {
  authMe: () => request<Profile>("/auth/me"),
  login: (email: string, password: string) => request<Profile>("/auth/login", { method: "POST", body: body({ email, password }) }),
  register: (data: { displayName: string; username: string; email: string; password: string }) => request<Profile>("/auth/register", { method: "POST", body: body(data) }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  forgotPassword: (email: string) => request<{ message: string }>("/auth/forgot-password", { method: "POST", body: body({ email }) }),
  resetPassword: (token: string, newPassword: string) => request<void>("/auth/reset-password", { method: "POST", body: body({ token, newPassword }) }),
  changePassword: (currentPassword: string, newPassword: string) => request<void>("/auth/change-password", { method: "POST", body: body({ currentPassword, newPassword }) }),
  listSessions: () => request<AuthSession[]>("/auth/sessions"),
  revokeOtherSessions: () => request<void>("/auth/sessions/others", { method: "DELETE" }),
  uploadAvatar: (file: File, crop?: { zoom: number; positionX: number; positionY: number }) => { const data = new FormData(); data.append("avatar", file); if (crop) Object.entries(crop).forEach(([key, value]) => data.append(key, String(value))); return request<Profile>("/profile/avatar", { method: "POST", body: data }); },
  removeAvatar: () => request<Profile>("/profile/avatar", { method: "DELETE" }),
  uploadCover: (file: File, crop?: { zoom: number; positionX: number; positionY: number }) => { const data = new FormData(); data.append("cover", file); if (crop) Object.entries(crop).forEach(([key, value]) => data.append(key, String(value))); return request<Profile>("/profile/cover", { method: "POST", body: data }); },
  removeCover: () => request<Profile>("/profile/cover", { method: "DELETE" }),
  saveProfileBundle: (changes: {
    profile: Partial<Pick<Profile, "displayName" | "username" | "bio">>;
    avatar?: { file?: File; remove?: boolean; crop?: { zoom: number; positionX: number; positionY: number } };
    cover?: { file?: File; remove?: boolean; crop?: { zoom: number; positionX: number; positionY: number } };
  }) => {
    const data = new FormData();
    data.append("profile", JSON.stringify(changes.profile));
    data.append("avatarAction", changes.avatar?.file ? "REPLACE" : changes.avatar?.remove ? "REMOVE" : "KEEP");
    data.append("coverAction", changes.cover?.file ? "REPLACE" : changes.cover?.remove ? "REMOVE" : "KEEP");
    if (changes.avatar?.file) data.append("avatar", changes.avatar.file);
    if (changes.cover?.file) data.append("cover", changes.cover.file);
    if (changes.avatar?.crop) data.append("avatarCrop", JSON.stringify(changes.avatar.crop));
    if (changes.cover?.crop) data.append("coverCrop", JSON.stringify(changes.cover.crop));
    return request<Profile>("/profile/me/bundle", { method: "PATCH", body: data });
  },
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
    data: Pick<GroupMember, "userId"> &
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
    request<GroupExpenseResult>(`/groups/${id}/expenses`, {
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
  payInvoice: (id: string, referenceMonth: string, accountId: string, amount?: number) =>
    request<InvoicePaymentResult>(`/credit-cards/${id}/invoices/${referenceMonth}/pay`, { method: "POST", body: body({ accountId, amount }) }),
  listNotifications: () => request<Notification[]>("/notifications"),
  markNotificationRead: (id: string) =>
    request<Notification>(`/notifications/${id}/read`, { method: "PATCH" }),
  getMyProfile: () => request<Profile>("/profile/me"),
  updateMyProfile: (data: Partial<Pick<Profile, "displayName" | "username" | "bio">>) =>
    request<Profile>("/profile/me", { method: "PATCH", body: body(data) }),
  usernameAvailability: (username: string, signal?: AbortSignal) =>
    request<{ username: string; available: boolean; message?: string }>(`/profiles/username-availability?username=${encodeURIComponent(username)}`, { signal }),
  searchUsers: (search: string, signal?: AbortSignal) =>
    request<(Profile & { relationship: "NONE" | "SENT" | "RECEIVED" | "FRIENDS" })[]>(`/users?search=${encodeURIComponent(search)}`, { signal }),
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
  listMessages: (id: string, signal?: AbortSignal) => request<Message[]>(`/conversations/${id}/messages`, { signal }),
  sendMessage: (id: string, content: string) => request<Message>(`/conversations/${id}/messages`, { method: "POST", body: body({ content }) }),
  markConversationRead: (id: string) => request<ConversationMember>(`/conversations/${id}/read`, { method: "PATCH" }),
  getGroupConversation: (groupId: string) => request<Conversation>(`/groups/${groupId}/conversation`),
};
