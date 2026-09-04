export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";
export type TransactionStatus = "PAID" | "RECEIVED" | "PENDING" | "OVERDUE";
export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  nature:
    "PERSONAL" | "CREDIT_CARD" | "GROUP" | "PIGGY_BANK" | "ACCOUNT_TRANSFER";
  /** Separates the user's private ledger from a shared group-fund audit entry. */
  financialScope?: "PERSONAL" | "SHARED";
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
  parentTransactionId?: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
  sourcePiggyBankId?: string;
  destinationPiggyBankId?: string;
  destinationGroupId?: string;
  destinationCreditCardId?: string;
  invoiceReference?: string;
  createdAt: string;
  updatedAt: string;
}
export interface PiggyBankMovement {
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
  movements: PiggyBankMovement[];
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
export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
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
  sourceAccountId?: string;
  financialTransactionId?: string;
  fundMovementId?: string;
  notes?: string;
  splits: GroupExpenseSplit[];
  createdAt: string;
}
export interface GroupFundMovement {
  id: string;
  groupId: string;
  expenseId: string;
  type: "EXPENSE";
  amount: number;
  date: string;
  description: string;
  createdAt: string;
}
export interface Settlement {
  id?: string;
  groupId?: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  status?: "SUGGESTED" | "PENDING" | "PAID" | "CANCELLED";
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
  fundMovements?: GroupFundMovement[];
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
  referenceMonth?: string;
  createdAt: string;
  updatedAt: string;
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
export interface CreditCardInvoicePayment {
  id: string;
  userId: string;
  cardId: string;
  referenceMonth: string;
  amount: number;
  accountId: string;
  date: string;
  transactionId: string;
  createdAt: string;
}

export interface Profile {
  userId: string;
  displayName: string;
  username: string;
  bio?: string;
  avatarPath?: string;
  avatarVersion: number;
  coverPath?: string;
  coverVersion: number;
  createdAt: string;
  updatedAt: string;
}
export interface User {
  id: string;
  emailNormalized: string;
  passwordHash: string;
  status: "ACTIVE" | "DISABLED";
  emailVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  passwordChangedAt?: string;
}
export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
  revokedAt?: string;
  createdIpMetadata?: string;
  userAgentMetadata?: string;
}
export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
}
export type AuditEventType =
  | "REGISTER_SUCCESS"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "PROFILE_UPDATED"
  | "USERNAME_CHANGED"
  | "AVATAR_UPDATED"
  | "AVATAR_REMOVED"
  | "COVER_UPDATED"
  | "COVER_REMOVED"
  | "SESSION_REVOKED"
  | "AUTHORIZATION_DENIED";
export interface AuditLog {
  id: string;
  eventType: AuditEventType;
  userId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
export type FriendRequestStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  createdAt: string;
  updatedAt: string;
}
export interface Friendship {
  id: string;
  userA: string;
  userB: string;
  createdAt: string;
}
export type ConversationType = "DIRECT" | "GROUP";
export interface Conversation {
  id: string;
  type: ConversationType;
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
