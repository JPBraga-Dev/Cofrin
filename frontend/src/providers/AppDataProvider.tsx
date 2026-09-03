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
  PiggyBank,
  PiggyInput,
  Transaction,
  TransactionInput,
} from "../types";

type Resource =
  "transactions" | "piggies" | "groups" | "budgets" | "cards" | "notifications";
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
  piggies: PiggyBank[];
  groups: Group[];
  budgets: Budget[];
  cards: CreditCard[];
  notifications: Notification[];
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
    amount: number,
    type: "DEPOSIT" | "WITHDRAWAL",
  ) => Promise<PiggyBank>;
  createGroup: (data: GroupInput) => Promise<Group>;
  addGroupContribution: (id: string, amount: number) => Promise<void>;
  addGroupExpense: (id: string, data: GroupExpenseAction) => Promise<void>;
  markSettlementPaid: (groupId: string, settlementId: string) => Promise<void>;
  createBudget: (data: BudgetInput) => Promise<Budget>;
  updateBudget: (id: string, data: Partial<BudgetInput>) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<void>;
  createCard: (data: CardInput) => Promise<CreditCard>;
  markNotificationRead: (id: string) => Promise<void>;
};
const Context = createContext<AppData | null>(null);
const replace = <T extends { id: string }>(items: T[], item: T) =>
  items.map((value) => (value.id === item.id ? item : value));

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [piggies, setPiggies] = useState<PiggyBank[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
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
        nextPiggies,
        nextGroups,
        nextBudgets,
        nextCards,
        nextNotifications,
      ] = await Promise.all([
        api.dashboard(),
        api.listTransactions(),
        api.listPiggyBanks(),
        api.listGroups(),
        api.listBudgets(),
        api.listCreditCards(),
        api.listNotifications(),
      ]);
      setDashboard(nextDashboard);
      setTransactions(nextTransactions);
      setPiggies(nextPiggies);
      setGroups(nextGroups);
      setBudgets(nextBudgets);
      setCards(nextCards);
      setNotifications(nextNotifications);
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
  const value = useMemo<AppData>(
    () => ({
      transactions,
      piggies,
      groups,
      budgets,
      cards,
      notifications,
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
          await Promise.all([refreshDashboard(), refreshBudgets()]);
          return item;
        }),
      updateTransaction: (id, data) =>
        run(async () => {
          const item = await api.updateTransaction(id, data);
          setTransactions((items) => replace(items, item));
          await Promise.all([refreshDashboard(), refreshBudgets()]);
          return item;
        }),
      deleteTransaction: (id) =>
        run(async () => {
          await api.deleteTransaction(id);
          setTransactions((items) => items.filter((item) => item.id !== id));
          await Promise.all([refreshDashboard(), refreshBudgets()]);
        }),
      createPiggy: (data) =>
        run(async () => {
          const item = await api.createPiggyBank(data);
          setPiggies((items) => [item, ...items]);
          return item;
        }),
      movePiggy: (id, amount, type) =>
        run(async () => {
          const item =
            type === "DEPOSIT"
              ? await api.depositPiggyBank(id, amount)
              : await api.withdrawPiggyBank(id, amount);
          setPiggies((items) => replace(items, item));
          return item;
        }),
      createGroup: (data) =>
        run(async () => {
          const item = await api.createGroup(data);
          setGroups((items) => [item, ...items]);
          return item;
        }),
      addGroupContribution: (id, amount) =>
        run(async () => {
          await api.addContribution(id, { userId: "u-joao", amount });
          await refreshGroup(id);
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
    }),
    [
      transactions,
      piggies,
      groups,
      budgets,
      cards,
      notifications,
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
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAppData() {
  const value = useContext(Context);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider");
  return value;
}
