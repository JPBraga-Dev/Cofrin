export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";
export type TransactionStatus = "PAID" | "RECEIVED" | "PENDING" | "OVERDUE";

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  nature:
    "PERSONAL" | "CREDIT_CARD" | "GROUP" | "PIGGY_BANK" | "ACCOUNT_TRANSFER";
  description: string;
  amount: number;
  date: string;
  categoryId: string;
  accountId: string;
  paymentMethod: string;
  status: TransactionStatus;
  recurrenceType: "SINGLE" | "RECURRING" | "INSTALLMENT";
  notes?: string;
  groupId?: string;
  creditCardId?: string;
  installmentNumber?: number;
  installmentCount?: number;
  sourceAccountId?: string;
  destinationAccountId?: string;
  sourcePiggyBankId?: string;
  destinationPiggyBankId?: string;
  destinationGroupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PiggyMovement {
  id: string;
  piggyBankId: string;
  userId: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  date: string;
  description?: string;
  accountId?: string;
  transactionId?: string;
  createdAt: string;
}
export interface PiggyBank {
  id: string;
  userId: string;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  initialAmount?: number;
  monthlyContribution?: number;
  deadline?: string;
  icon?: string;
  status: "ACTIVE" | "COMPLETED" | "PAUSED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  movements: PiggyMovement[];
}
export interface Account {
  id: string;
  userId: string;
  name: string;
  type: "CHECKING" | "CASH" | "SAVINGS";
  initialBalance: number;
  createdAt: string;
  updatedAt: string;
}
export interface PiggyTransferResult {
  piggy: PiggyBank;
  transaction: Transaction;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  name: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  expectedContribution: number;
  joinedAt: string;
  status: "ACTIVE" | "INVITED" | "LEFT" | "REMOVED";
  balance: number;
}
export interface GroupContribution {
  id: string;
  groupId: string;
  userId: string;
  amount: number;
  sourceAccountId?: string;
  financialTransactionId?: string;
  date: string;
  description?: string;
  status: "CONFIRMED" | "PENDING" | "CANCELLED";
  createdAt: string;
}
export interface GroupContributionTransferResult {
  group: Group;
  contribution: GroupContribution;
  transaction: Transaction;
}
export interface GroupExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
  percentage?: number;
  shares?: number;
  status: "PENDING" | "SETTLED";
}
export interface GroupExpense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidByUserId: string;
  date: string;
  category: string;
  splitType: "EQUAL" | "PERCENTAGE" | "SHARES" | "MANUAL";
  paymentSource: "GROUP_FUND" | "MEMBER";
  notes?: string;
  splits: GroupExpenseSplit[];
  createdAt: string;
}
export interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  status: "SUGGESTED" | "PENDING" | "PAID" | "CANCELLED";
  createdAt?: string;
  settledAt?: string;
}
export interface Group {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  type: "TRIP" | "EVENT" | "HOUSE" | "GIFT" | "COUPLE" | "GOAL" | "OTHER";
  targetAmount?: number;
  /** Saldo coletivo declarado quando o grupo começou a ser controlado no Cofrin. */
  initialFundAmount?: number;
  eventDate?: string;
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  members: GroupMember[];
  contributions: GroupContribution[];
  expenses: GroupExpense[];
  settlements: Settlement[];
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  limitAmount: number;
  currentAmount: number;
  period: "MONTHLY" | "WEEKLY" | "CUSTOM";
  /** Mês de referência no formato YYYY-MM. Mantém os gastos de cada mês isolados. */
  referenceMonth?: string;
  createdAt: string;
  updatedAt: string;
}
export interface Profile {
  id: string;
  displayName: string;
  username: string;
  bio?: string;
  email?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}
export type FriendRelationship = "NONE" | "SENT" | "RECEIVED" | "FRIENDS";
export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
}
export interface Conversation {
  id: string;
  type: "DIRECT" | "GROUP";
  groupId?: string;
  createdAt: string;
  updatedAt: string;
}
export interface ConversationMember {
  conversationId: string;
  userId: string;
  joinedAt: string;
  lastReadAt?: string;
}
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}
export interface ConversationView extends Conversation {
  title: string;
  subtitle?: string;
  avatarUserId?: string;
  lastMessage?: Message;
  unreadCount: number;
  memberIds: string[];
}
export interface CreditCard {
  id: string;
  userId: string;
  name: string;
  brand: string;
  lastFourDigits: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}
export interface InvoiceSummary {
  currentInvoice: number;
  nextInvoice: number;
  futureInvoices: number[];
}
export interface GroupBalance {
  userId: string;
  name: string;
  balance: number;
}
export interface GroupSummary {
  group: Group;
  fund: number;
  totalContributed: number;
  totalExpenses: number;
  balances: GroupBalance[];
  settlements: Settlement[];
}
export interface DashboardData {
  totalBalance: number;
  income: number;
  expenses: number;
  committed: number;
  savingsRate: number;
  upcomingBills: Transaction[];
  accounts: { id: string; name: string; balance: number }[];
}

export type TransactionInput = Omit<
  Transaction,
  | "id"
  | "userId"
  | "createdAt"
  | "updatedAt"
  | "status"
  | "nature"
  | "recurrenceType"
> &
  Partial<Pick<Transaction, "status" | "nature" | "recurrenceType">>;
export type PiggyInput = Pick<
  PiggyBank,
  "name" | "description" | "targetAmount"
> &
  Partial<
    Pick<PiggyBank, "monthlyContribution" | "deadline" | "icon" | "status">
  >;
export type GroupInput = Pick<Group, "name" | "description" | "type"> &
  Partial<Pick<Group, "targetAmount" | "eventDate">> & {
    participantUserIds?: string[];
  };
export type BudgetInput = Pick<Budget, "categoryId" | "limitAmount"> &
  Partial<Pick<Budget, "period" | "referenceMonth">>;
export type CardInput = Pick<
  CreditCard,
  "name" | "brand" | "lastFourDigits" | "limit" | "closingDay" | "dueDay"
> &
  Partial<Pick<CreditCard, "color">>;
