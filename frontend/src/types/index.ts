export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type TransactionStatus = 'PAID' | 'RECEIVED' | 'PENDING' | 'OVERDUE';
export interface Transaction { id: string; description: string; amount: number; type: TransactionType; nature: 'PERSONAL'|'CREDIT_CARD'|'GROUP'|'PIGGY_BANK'|'ACCOUNT_TRANSFER'; date: string; category: string; account: string; status: TransactionStatus; paymentMethod: string; installment?: string; }
export interface PiggyBank { id: string; name: string; description: string; currentAmount: number; targetAmount: number; monthlyContribution: number; deadline: string; icon: string; status: 'ACTIVE'|'COMPLETED'|'PAUSED'; movements: { id: string; type: 'DEPOSIT'|'WITHDRAWAL'; amount: number; date: string; description: string }[]; }
export interface GroupMember { id: string; name: string; initials: string; contribution: number; balance: number; }
export interface Group { id: string; name: string; type: string; description: string; targetAmount?: number; fund: number; totalExpenses: number; eventDate: string; emoji: string; color: string; members: GroupMember[]; activity: string[]; }
export interface Budget { id: string; category: string; limit: number; spent: number; color: string; }
