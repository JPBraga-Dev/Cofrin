import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "../services/api";
import { preferences } from "../services/preferences";
import type {
  Budget,
  BudgetInput,
  CardInput,
  CreditCard,
  DashboardData,
  Group,
  GroupExpense,
  GroupInput,
  Notification,
  Conversation,
  ConversationView,
  FriendRequest,
  Message,
  Profile,
  PiggyBank,
  PiggyInput,
  Transaction,
  TransactionInput,
} from "../types";

type Resource =
  "transactions" | "piggies" | "groups" | "budgets" | "cards" | "notifications" | "social";
export type GroupExpenseAction = Pick<
  GroupExpense,
  | "description"
  | "amount"
  | "paidByUserId"
  | "date"
  | "category"
  | "splitType"
  | "paymentSource"
> & {
  participants?: {
    userId: string;
    percentage?: number;
    shares?: number;
    amount?: number;
  }[];
};
type AppData = {
  transactions: Transaction[];
  accounts: { id: string; name: string; balance: number }[];
  piggies: PiggyBank[];
  groups: Group[];
  budgets: Budget[];
  cards: CreditCard[];
  notifications: Notification[];
  profile: Profile | null;
  friends: Profile[];
  friendRequests: (FriendRequest & { profile: Profile; direction: "SENT" | "RECEIVED" })[];
  conversations: ConversationView[];
  dashboard: DashboardData | null;
  loading: boolean;
  error: string | null;
  toast: string | null;
  pending: Partial<Record<Resource | "mutation", boolean>>;
  hidden: boolean;
  compact: boolean;
  setHidden: (value: boolean) => void;
  setCompact: (value: boolean) => void;
  refresh: () => Promise<void>;
  createTransaction: (data: TransactionInput) => Promise<Transaction>;
  updateTransaction: (
    id: string,
    data: Partial<TransactionInput>,
  ) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  createPiggy: (data: PiggyInput) => Promise<PiggyBank>;
  movePiggy: (
    id: string,
    accountId: string,
    amount: number,
    type: "DEPOSIT" | "WITHDRAWAL",
  ) => Promise<PiggyBank>;
  createGroup: (data: GroupInput) => Promise<Group>;
  addGroupContribution: (id: string, sourceAccountId: string, amount: number) => Promise<void>;
  addGroupExpense: (id: string, data: GroupExpenseAction) => Promise<void>;
  markSettlementPaid: (groupId: string, settlementId: string) => Promise<void>;
  createBudget: (data: BudgetInput) => Promise<Budget>;
  updateBudget: (id: string, data: Partial<BudgetInput>) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<void>;
  createCard: (data: CardInput) => Promise<CreditCard>;
  markNotificationRead: (id: string) => Promise<void>;
  searchPeople: (query: string) => Promise<(Profile & { relationship: "NONE" | "SENT" | "RECEIVED" | "FRIENDS" })[]>;
  updateProfile: (data: Partial<Pick<Profile, "displayName" | "username" | "bio" | "avatarUrl">>) => Promise<Profile>;
  checkUsername: (username: string) => Promise<{ username: string; available: boolean; message?: string }>;
  sendFriendRequest: (userId: string) => Promise<void>;
  acceptFriendRequest: (id: string) => Promise<void>;
  declineFriendRequest: (id: string) => Promise<void>;
  cancelFriendRequest: (id: string) => Promise<void>;
  removeFriend: (userId: string) => Promise<void>;
  openDirectConversation: (userId: string) => Promise<Conversation>;
  getGroupConversation: (groupId: string) => Promise<Conversation>;
  getMessages: (conversationId: string) => Promise<Message[]>;
  sendConversationMessage: (conversationId: string, content: string) => Promise<Message>;
  markConversationRead: (conversationId: string) => Promise<void>;
};
const Context = createContext<AppData | null>(null);
const replace = <T extends { id: string }>(items: T[], item: T) =>
  items.map((value) => (value.id === item.id ? item : value));

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string; balance: number }[]>([]);
  const [piggies, setPiggies] = useState<PiggyBank[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [friendRequests, setFriendRequests] = useState<AppData["friendRequests"]>([]);
  const [conversations, setConversations] = useState<ConversationView[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState<
    Partial<Record<Resource | "mutation", boolean>>
  >({});
  const [hidden, setHiddenState] = useState(() =>
    preferences.getBoolean("cofrin-hidden"),
  );
  const [compact, setCompactState] = useState(() =>
    preferences.getBoolean("cofrin-compact"),
  );
  const setHidden = useCallback((value: boolean) => {
    setHiddenState(value);
    preferences.setBoolean("cofrin-hidden", value);
  }, []);
  const setCompact = useCallback((value: boolean) => {
    setCompactState(value);
    preferences.setBoolean("cofrin-compact", value);
  }, []);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        nextDashboard,
        nextTransactions,
        nextAccounts,
        nextPiggies,
        nextGroups,
        nextBudgets,
        nextCards,
        nextNotifications,
        nextProfile,
        nextFriends,
        nextFriendRequests,
        nextConversations,
      ] = await Promise.all([
        api.dashboard(),
        api.listTransactions(),
        api.listAccounts(),
        api.listPiggyBanks(),
        api.listGroups(),
        api.listBudgets(),
        api.listCreditCards(),
        api.listNotifications(),
        api.getMyProfile(),
        api.listFriends(),
        api.listFriendRequests(),
        api.listConversations(),
      ]);
      setDashboard(nextDashboard);
      setTransactions(nextTransactions);
      setAccounts(nextAccounts);
      setPiggies(nextPiggies);
      setGroups(nextGroups);
      setBudgets(nextBudgets);
      setCards(nextCards);
      setNotifications(nextNotifications);
      setProfile(nextProfile);
      setFriends(nextFriends);
      setFriendRequests(nextFriendRequests);
      setConversations(nextConversations);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível carregar os dados do cofrin.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  const run = useCallback(async <T,>(work: () => Promise<T>) => {
    setPending((value) => ({ ...value, mutation: true }));
    setError(null);
    try {
      const result = await work();
      setToast("Alteração salva.");
      return result;
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível salvar sua alteração.";
      setError(message);
      throw cause;
    } finally {
      setPending((value) => ({ ...value, mutation: false }));
    }
  }, []);
  const refreshDashboard = useCallback(
    async () => setDashboard(await api.dashboard()),
    [],
  );
  const refreshBudgets = useCallback(async () => {
    setBudgets(await api.listBudgets());
  }, []);
  const refreshGroup = useCallback(async (id: string) => {
    const group = await api.getGroup(id);
    setGroups((items) => replace(items, group));
    return group;
  }, []);
  const refreshSocial = useCallback(async () => {
    const [nextProfile, nextFriends, nextRequests, nextConversations] = await Promise.all([api.getMyProfile(), api.listFriends(), api.listFriendRequests(), api.listConversations()]);
    setProfile(nextProfile);
    setFriends(nextFriends);
    setFriendRequests(nextRequests);
    setConversations(nextConversations);
  }, []);
  const value = useMemo<AppData>(
    () => ({
      transactions,
      accounts,
      piggies,
      groups,
      budgets,
      cards,
      notifications,
      profile,
      friends,
      friendRequests,
      conversations,
      dashboard,
      loading,
      error,
      toast,
      pending,
      hidden,
      compact,
      setHidden,
      setCompact,
      refresh,
      createTransaction: (data) =>
        run(async () => {
          const item = await api.createTransaction(data);
          setTransactions((items) => [item, ...items]);
          const [, nextAccounts] = await Promise.all([refreshDashboard(), api.listAccounts(), refreshBudgets()]);
          setAccounts(nextAccounts);
          return item;
        }),
      updateTransaction: (id, data) =>
        run(async () => {
          const item = await api.updateTransaction(id, data);
          setTransactions((items) => replace(items, item));
          const [, nextAccounts] = await Promise.all([refreshDashboard(), api.listAccounts(), refreshBudgets()]);
          setAccounts(nextAccounts);
          return item;
        }),
      deleteTransaction: (id) =>
        run(async () => {
          await api.deleteTransaction(id);
          setTransactions((items) => items.filter((item) => item.id !== id));
          const [, nextAccounts] = await Promise.all([refreshDashboard(), api.listAccounts(), refreshBudgets()]);
          setAccounts(nextAccounts);
        }),
      createPiggy: (data) =>
        run(async () => {
          const item = await api.createPiggyBank(data);
          setPiggies((items) => [item, ...items]);
          return item;
        }),
      movePiggy: (id, accountId, amount, type) =>
        run(async () => {
          const result =
            type === "DEPOSIT"
              ? await api.depositPiggyBank(id, accountId, amount)
              : await api.withdrawPiggyBank(id, accountId, amount);
          setPiggies((items) => replace(items, result.piggy));
          setTransactions((items) => [result.transaction, ...items]);
          const [nextDashboard, nextAccounts] = await Promise.all([api.dashboard(), api.listAccounts()]);
          setDashboard(nextDashboard);
          setAccounts(nextAccounts);
          return result.piggy;
        }),
      createGroup: (data) =>
        run(async () => {
          const item = await api.createGroup(data);
          setGroups((items) => [item, ...items]);
          return item;
        }),
      addGroupContribution: (id, sourceAccountId, amount) =>
        run(async () => {
          const result = await api.addContribution(id, { sourceAccountId, amount });
          setGroups((items) => replace(items, result.group));
          setTransactions((items) => [result.transaction, ...items]);
          const [nextDashboard, nextAccounts] = await Promise.all([api.dashboard(), api.listAccounts()]);
          setDashboard(nextDashboard);
          setAccounts(nextAccounts);
        }),
      addGroupExpense: (id, data) =>
        run(async () => {
          const group = groups.find((item) => item.id === id);
          const payer =
            group?.members.find(
              (member) => member.userId === data.paidByUserId,
            ) ?? group?.members[0];
          if (!payer) throw new Error("Grupo sem participante disponível.");
          const members =
            group?.members.filter((member) => member.status === "ACTIVE") ?? [];
          const participants =
            data.participants ??
            members.map((member) => ({
              userId: member.userId,
              shares: data.splitType === "SHARES" ? 1 : undefined,
            }));
          await api.addExpense(id, {
            ...data,
            paidByUserId: payer.userId,
            participants,
          });
          await refreshGroup(id);
        }),
      markSettlementPaid: (groupId, settlementId) =>
        run(async () => {
          await api.markSettlementPaid(groupId, settlementId);
          await refreshGroup(groupId);
        }),
      createBudget: (data) =>
        run(async () => {
          const item = await api.createBudget(data);
          await refreshBudgets();
          return item;
        }),
      updateBudget: (id, data) =>
        run(async () => {
          const item = await api.updateBudget(id, data);
          setBudgets((items) => replace(items, item));
          return item;
        }),
      deleteBudget: (id) =>
        run(async () => {
          await api.deleteBudget(id);
          setBudgets((items) => items.filter((item) => item.id !== id));
        }),
      createCard: (data) =>
        run(async () => {
          const item = await api.createCreditCard(data);
          setCards((items) => [item, ...items]);
          return item;
        }),
      markNotificationRead: (id) =>
        run(async () => {
          const item = await api.markNotificationRead(id);
          setNotifications((items) => replace(items, item));
        }),
      searchPeople: (query) => api.searchUsers(query),
      checkUsername: (username) => api.usernameAvailability(username),
      updateProfile: (data) => run(async () => {
        const item = await api.updateMyProfile(data);
        setProfile(item);
        setGroups((items) => items.map((group) => ({
          ...group,
          members: group.members.map((member) => member.userId === item.id ? { ...member, name: item.displayName } : member),
        })));
        await refreshSocial();
        setToast("Perfil atualizado.");
        return item;
      }),
      sendFriendRequest: (userId) => run(async () => { await api.sendFriendRequest(userId); await refreshSocial(); }),
      acceptFriendRequest: (id) => run(async () => { await api.acceptFriendRequest(id); await refreshSocial(); }),
      declineFriendRequest: (id) => run(async () => { await api.declineFriendRequest(id); await refreshSocial(); }),
      cancelFriendRequest: (id) => run(async () => { await api.cancelFriendRequest(id); await refreshSocial(); }),
      removeFriend: (userId) => run(async () => { await api.removeFriend(userId); await refreshSocial(); }),
      openDirectConversation: (userId) => run(async () => { const item = await api.createDirectConversation(userId); await refreshSocial(); return item; }),
      getGroupConversation: (groupId) => api.getGroupConversation(groupId),
      getMessages: (conversationId) => api.listMessages(conversationId),
      sendConversationMessage: (conversationId, content) => run(async () => { const item = await api.sendMessage(conversationId, content); await refreshSocial(); return item; }),
      markConversationRead: (conversationId) => run(async () => { await api.markConversationRead(conversationId); await refreshSocial(); }),
    }),
    [
      transactions,
      accounts,
      piggies,
      groups,
      budgets,
      cards,
      notifications,
      profile,
      friends,
      friendRequests,
      conversations,
      dashboard,
      loading,
      error,
      toast,
      pending,
      hidden,
      compact,
      setHidden,
      setCompact,
      refresh,
      run,
      refreshDashboard,
      refreshBudgets,
      refreshGroup,
      refreshSocial,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAppData() {
  const value = useContext(Context);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider");
  return value;
}
