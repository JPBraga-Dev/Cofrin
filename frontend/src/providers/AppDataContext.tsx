import { createContext, useContext } from "react";
import type {
  Budget, BudgetInput, CardInput, Conversation, ConversationView, CreditCard,
  FriendRequest, Group, GroupExpense, GroupInput, Message, Notification, PiggyBank,
  PiggyInput, Profile, Transaction, TransactionInput,
} from "../types";

export type Resource = "transactions" | "piggies" | "groups" | "budgets" | "cards" | "notifications" | "social";
export type ResourceStatus = { status: "idle" | "loading" | "ready" | "error"; error: string | null };
export type Mutation =
  | "createTransaction" | "updateTransaction" | "deleteTransaction"
  | "createPiggy" | "movePiggy" | "createGroup" | "addGroupContribution" | "addGroupExpense"
  | "markSettlementPaid" | "createBudget" | "updateBudget" | "deleteBudget" | "createCard" | "payInvoice"
  | "markNotificationRead" | "updateProfile" | "uploadAvatar" | "removeAvatar" | "uploadCover" | "removeCover" | "saveProfile"
  | "sendFriendRequest" | "acceptFriendRequest" | "declineFriendRequest" | "cancelFriendRequest" | "removeFriend"
  | "openConversation" | "sendMessage" | "markConversationRead";

export type MessageResource = {
  items: Message[];
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  lastFetchedAt?: number;
};

export type GroupExpenseAction = Pick<GroupExpense, "description" | "amount" | "paidByUserId" | "date" | "category" | "splitType" | "paymentSource"> & {
  sourceAccountId?: string;
  participants?: { userId: string; percentage?: number; shares?: number; amount?: number }[];
};

export type AppData = {
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
  messageResources: Record<string, MessageResource>;
  loading: boolean;
  error: string | null;
  resourceStatus: Record<Resource, ResourceStatus>;
  toast: string | null;
  pending: Partial<Record<Resource | Mutation | "mutation", boolean>>;
  hidden: boolean;
  compact: boolean;
  setHidden: (value: boolean) => void;
  setCompact: (value: boolean) => void;
  refresh: () => Promise<void>;
  createTransaction: (data: TransactionInput) => Promise<Transaction>;
  updateTransaction: (id: string, data: Partial<TransactionInput>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  createPiggy: (data: PiggyInput) => Promise<PiggyBank>;
  movePiggy: (id: string, accountId: string, amount: number, type: "DEPOSIT" | "WITHDRAWAL") => Promise<PiggyBank>;
  createGroup: (data: GroupInput) => Promise<Group>;
  addGroupContribution: (id: string, sourceAccountId: string, amount: number) => Promise<void>;
  addGroupExpense: (id: string, data: GroupExpenseAction) => Promise<void>;
  markSettlementPaid: (groupId: string, settlementId: string) => Promise<void>;
  createBudget: (data: BudgetInput) => Promise<Budget>;
  updateBudget: (id: string, data: Partial<BudgetInput>) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<void>;
  createCard: (data: CardInput) => Promise<CreditCard>;
  payInvoice: (cardId: string, referenceMonth: string, accountId: string, amount?: number) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  searchPeople: (query: string, signal?: AbortSignal) => Promise<(Profile & { relationship: "NONE" | "SENT" | "RECEIVED" | "FRIENDS" })[]>;
  updateProfile: (data: Partial<Pick<Profile, "displayName" | "username" | "bio">>) => Promise<Profile>;
  uploadAvatar: (file: File, crop?: { zoom: number; positionX: number; positionY: number }) => Promise<Profile>;
  removeAvatar: () => Promise<Profile>;
  uploadCover: (file: File, crop?: { zoom: number; positionX: number; positionY: number }) => Promise<Profile>;
  removeCover: () => Promise<Profile>;
  saveProfileChanges: (changes: {
    profile: Partial<Pick<Profile, "displayName" | "username" | "bio">>;
    avatar?: { file?: File; remove?: boolean; crop?: { zoom: number; positionX: number; positionY: number } };
    cover?: { file?: File; remove?: boolean; crop?: { zoom: number; positionX: number; positionY: number } };
  }) => Promise<Profile>;
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

export const AppDataContext = createContext<AppData | null>(null);

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider");
  return value;
}
