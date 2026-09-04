import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../services/api";
import { preferences } from "../services/preferences";
import { useAuth } from "./AuthProvider";
import type { Budget, ConversationView, CreditCard, Group, Notification, PiggyBank, Profile, Transaction } from "../types";
import { AppDataContext, type AppData, type Mutation, type Resource, type ResourceStatus } from "./AppDataContext";
import { useConversationMessages } from "./useConversationMessages";
const replace = <T extends { id: string }>(items: T[], item: T) =>
  items.map((value) => (value.id === item.id ? item : value));

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { refreshIdentity } = useAuth();
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
  const { messageResources, getMessages, appendMessage } = useConversationMessages();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resourceStatus, setResourceStatus] = useState<Record<Resource, ResourceStatus>>({
    transactions: { status: "idle", error: null },
    piggies: { status: "idle", error: null },
    groups: { status: "idle", error: null },
    budgets: { status: "idle", error: null },
    cards: { status: "idle", error: null },
    notifications: { status: "idle", error: null },
    social: { status: "idle", error: null },
  });
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
    setError(null);
    const load = async <T,>(resource: Resource, request: () => Promise<T>, assign: (value: T) => void) => {
      setResourceStatus((current) => ({ ...current, [resource]: { status: "loading", error: null } }));
      try {
        assign(await request());
        setResourceStatus((current) => ({ ...current, [resource]: { status: "ready", error: null } }));
        return true;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Não foi possível carregar este conteúdo.";
        setResourceStatus((current) => ({ ...current, [resource]: { status: "error", error: message } }));
        return false;
      }
    };
    try {
      const results = await Promise.all([
        load("transactions", api.listTransactions, setTransactions),
        load("transactions", api.listAccounts, setAccounts),
        load("piggies", api.listPiggyBanks, setPiggies),
        load("groups", api.listGroups, setGroups),
        load("budgets", api.listBudgets, setBudgets),
        load("cards", api.listCreditCards, setCards),
        load("notifications", api.listNotifications, setNotifications),
        load("social", api.getMyProfile, setProfile),
        load("social", api.listFriends, setFriends),
        load("social", api.listFriendRequests, setFriendRequests),
        load("social", api.listConversations, setConversations),
      ]);
      if (!results.some(Boolean)) setError("Não foi possível carregar os dados do cofrin.");
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
  const run = useCallback(async <T,>(mutation: Mutation, work: () => Promise<T>) => {
    setPending((value) => ({ ...value, [mutation]: true, mutation: true }));
    try {
      const result = await work();
      setToast("Alteração salva.");
      return result;
    } catch (cause) {
      throw cause;
    } finally {
      setPending((value) => {
        const next = { ...value, [mutation]: false };
        next.mutation = Object.entries(next).some(([key, active]) => key !== "mutation" && active);
        return next;
      });
    }
  }, []);
  const refreshBudgets = useCallback(async () => {
    setBudgets(await api.listBudgets());
  }, []);
  const refreshGroup = useCallback(async (id: string) => {
    const group = await api.getGroup(id);
    setGroups((items) => replace(items, group));
    return group;
  }, []);
  const refreshSocial = useCallback(async () => {
    const [nextProfile, nextFriends, nextRequests, nextConversations, nextGroups] = await Promise.all([api.getMyProfile(), api.listFriends(), api.listFriendRequests(), api.listConversations(), api.listGroups()]);
    setProfile(nextProfile);
    setFriends(nextFriends);
    setFriendRequests(nextRequests);
    setConversations(nextConversations);
    setGroups(nextGroups);
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
      messageResources,
      loading,
      error,
      resourceStatus,
      toast,
      pending,
      hidden,
      compact,
      setHidden,
      setCompact,
      refresh,
      createTransaction: (data) =>
        run("createTransaction", async () => {
          const item = await api.createTransaction(data);
          if (item.recurrenceType === "INSTALLMENT") setTransactions(await api.listTransactions());
          else setTransactions((items) => [item, ...items]);
          const [, nextAccounts] = await Promise.all([refreshBudgets(), api.listAccounts()]);
          setAccounts(nextAccounts);
          return item;
        }),
      updateTransaction: (id, data) =>
        run("updateTransaction", async () => {
          const item = await api.updateTransaction(id, data);
          setTransactions((items) => replace(items, item));
          const [, nextAccounts] = await Promise.all([refreshBudgets(), api.listAccounts()]);
          setAccounts(nextAccounts);
          return item;
        }),
      deleteTransaction: (id) =>
        run("deleteTransaction", async () => {
          await api.deleteTransaction(id);
          setTransactions((items) => items.filter((item) => item.id !== id));
          const [, nextAccounts] = await Promise.all([refreshBudgets(), api.listAccounts()]);
          setAccounts(nextAccounts);
        }),
      createPiggy: (data) =>
        run("createPiggy", async () => {
          const item = await api.createPiggyBank(data);
          setPiggies((items) => [item, ...items]);
          return item;
        }),
      movePiggy: (id, accountId, amount, type) =>
        run("movePiggy", async () => {
          const result =
            type === "DEPOSIT"
              ? await api.depositPiggyBank(id, accountId, amount)
              : await api.withdrawPiggyBank(id, accountId, amount);
          setPiggies((items) => replace(items, result.piggy));
          setTransactions((items) => [result.transaction, ...items]);
          const nextAccounts = await api.listAccounts();
          setAccounts(nextAccounts);
          return result.piggy;
        }),
      createGroup: (data) =>
        run("createGroup", async () => {
          const item = await api.createGroup(data);
          setGroups((items) => [item, ...items]);
          return item;
        }),
      addGroupContribution: (id, sourceAccountId, amount) =>
        run("addGroupContribution", async () => {
          const result = await api.addContribution(id, { sourceAccountId, amount });
          setGroups((items) => replace(items, result.group));
          setTransactions((items) => [result.transaction, ...items]);
          const nextAccounts = await api.listAccounts();
          setAccounts(nextAccounts);
        }),
      addGroupExpense: (id, data) =>
        run("addGroupExpense", async () => {
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
          const result = await api.addExpense(id, {
            ...data,
            paidByUserId: payer.userId,
            participants,
          });
          setGroups((items) => replace(items, result.group));
          if (result.transaction)
            setTransactions((items) => [result.transaction!, ...items]);
          if (result.transaction?.financialScope === "PERSONAL") {
            const [, nextAccounts] = await Promise.all([refreshBudgets(), api.listAccounts()]);
            setAccounts(nextAccounts);
          }
        }),
      markSettlementPaid: (groupId, settlementId) =>
        run("markSettlementPaid", async () => {
          await api.markSettlementPaid(groupId, settlementId);
          await refreshGroup(groupId);
        }),
      createBudget: (data) =>
        run("createBudget", async () => {
          const item = await api.createBudget(data);
          await refreshBudgets();
          return item;
        }),
      updateBudget: (id, data) =>
        run("updateBudget", async () => {
          const item = await api.updateBudget(id, data);
          setBudgets((items) => replace(items, item));
          return item;
        }),
      deleteBudget: (id) =>
        run("deleteBudget", async () => {
          await api.deleteBudget(id);
          setBudgets((items) => items.filter((item) => item.id !== id));
        }),
      createCard: (data) =>
        run("createCard", async () => {
          const item = await api.createCreditCard(data);
          setCards((items) => [item, ...items]);
          return item;
        }),
      payInvoice: (cardId, referenceMonth, accountId, amount) =>
        run("payInvoice", async () => {
          const result = await api.payInvoice(cardId, referenceMonth, accountId, amount);
          setTransactions((items) => [result.transaction, ...items]);
          setAccounts(await api.listAccounts());
        }),
      markNotificationRead: (id) =>
        run("markNotificationRead", async () => {
          const item = await api.markNotificationRead(id);
          setNotifications((items) => replace(items, item));
        }),
      searchPeople: (query, signal) => api.searchUsers(query, signal),
      checkUsername: (username) => api.usernameAvailability(username),
      updateProfile: (data) => run("updateProfile", async () => {
        const item = await api.updateMyProfile(data);
        setProfile(item);
        await refreshSocial();
        await refreshIdentity();
        setToast("Perfil atualizado.");
        return item;
      }),
      uploadAvatar: (file, crop) => run("uploadAvatar", async () => { const item = await api.uploadAvatar(file, crop); setProfile(item); await Promise.all([refreshSocial(), refreshIdentity()]); setToast("Foto atualizada."); return item; }),
      removeAvatar: () => run("removeAvatar", async () => { const item = await api.removeAvatar(); setProfile(item); await Promise.all([refreshSocial(), refreshIdentity()]); setToast("Foto removida."); return item; }),
      uploadCover: (file, crop) => run("uploadCover", async () => { const item = await api.uploadCover(file, crop); setProfile(item); await Promise.all([refreshSocial(), refreshIdentity()]); setToast("Capa atualizada."); return item; }),
      removeCover: () => run("removeCover", async () => { const item = await api.removeCover(); setProfile(item); await Promise.all([refreshSocial(), refreshIdentity()]); setToast("Capa removida."); return item; }),
      saveProfileChanges: (changes) => run("saveProfile", async () => {
        const item = await api.saveProfileBundle(changes);
        setProfile(item);
        await Promise.all([refreshSocial(), refreshIdentity()]);
        setToast("Perfil atualizado.");
        return item;
      }),
      sendFriendRequest: (userId) => run("sendFriendRequest", async () => { await api.sendFriendRequest(userId); await refreshSocial(); }),
      acceptFriendRequest: (id) => run("acceptFriendRequest", async () => { await api.acceptFriendRequest(id); await refreshSocial(); }),
      declineFriendRequest: (id) => run("declineFriendRequest", async () => { await api.declineFriendRequest(id); await refreshSocial(); }),
      cancelFriendRequest: (id) => run("cancelFriendRequest", async () => { await api.cancelFriendRequest(id); await refreshSocial(); }),
      removeFriend: (userId) => run("removeFriend", async () => { await api.removeFriend(userId); await refreshSocial(); }),
      openDirectConversation: (userId) => run("openConversation", async () => { const item = await api.createDirectConversation(userId); await refreshSocial(); return item; }),
      getGroupConversation: (groupId) => api.getGroupConversation(groupId),
      getMessages,
      sendConversationMessage: (conversationId, content) => run("sendMessage", async () => {
        const item = await api.sendMessage(conversationId, content);
        appendMessage(conversationId, item);
        setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, lastMessage: item, updatedAt: item.createdAt } : conversation));
        return item;
      }),
      markConversationRead: (conversationId) => run("markConversationRead", async () => {
        await api.markConversationRead(conversationId);
        setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation));
      }),
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
      messageResources,
      loading,
      error,
      resourceStatus,
      toast,
      pending,
      hidden,
      compact,
      setHidden,
      setCompact,
      refresh,
      run,
      refreshBudgets,
      refreshGroup,
      refreshSocial,
      getMessages,
      appendMessage,
      refreshIdentity,
    ],
  );
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export { useAppData } from "./AppDataContext";
export type { GroupExpenseAction, MessageResource } from "./AppDataContext";
