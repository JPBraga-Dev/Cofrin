import type { Account, Budget, Conversation, ConversationMember, FriendRequest, Friendship, Group, Message, PiggyBank, Profile, Transaction } from "../domain/types.js";
const now = "2026-08-31T12:00:00.000Z";
const transactionHistory: Transaction[] = [
  [
    "t6",
    "Supermercado Verde",
    284.7,
    "EXPENSE",
    "2026-08-27",
    "food",
    "CREDIT",
  ],
  ["t7", "Uber", 42.5, "EXPENSE", "2026-08-28", "transport", "PIX"],
  ["t8", "Academia", 129.9, "EXPENSE", "2026-08-10", "health", "PIX"],
  ["t9", "Netflix", 55.9, "EXPENSE", "2026-09-05", "subscriptions", "CREDIT"],
  [
    "t10",
    "Conta de energia",
    186.4,
    "EXPENSE",
    "2026-09-12",
    "housing",
    "BOLETO",
  ],
  [
    "t11",
    "Projeto Horizonte",
    1000,
    "INCOME",
    "2026-08-16",
    "freelance",
    "PIX",
  ],
  ["t12", "Farmácia Central", 76.4, "EXPENSE", "2026-08-22", "health", "DEBIT"],
  ["t13", "Cinema", 58, "EXPENSE", "2026-08-20", "leisure", "CREDIT"],
  ["t14", "Combustível", 180, "EXPENSE", "2026-08-18", "transport", "PIX"],
  ["t15", "Restituição", 312, "INCOME", "2026-07-18", "reimbursement", "PIX"],
  [
    "t16",
    "Mercado Bom Preço",
    193.2,
    "EXPENSE",
    "2026-07-25",
    "food",
    "CREDIT",
  ],
  [
    "t17",
    "Plano celular",
    59.9,
    "EXPENSE",
    "2026-07-12",
    "subscriptions",
    "PIX",
  ],
  [
    "t18",
    "Curso online",
    189.9,
    "EXPENSE",
    "2026-05-09",
    "education",
    "CREDIT",
  ],
  [
    "t19",
    "Bônus de desempenho",
    850,
    "INCOME",
    "2026-05-05",
    "bonus",
    "TRANSFER",
  ],
  ["t20", "Consulta médica", 220, "EXPENSE", "2026-06-14", "health", "PIX"],
  ["t21", "Transferência para viagem", 550, "TRANSFER", "2026-08-25", "goals", "TRANSFER"],
].map(([id, description, amount, type, date, categoryId, paymentMethod]) => ({
  id: id as string,
  userId: "u-joao",
  type: type as Transaction["type"],
  nature: (type === "TRANSFER" ? "PIGGY_BANK" : "PERSONAL") as Transaction["nature"],
  description: description as string,
  amount: amount as number,
  date: date as string,
  categoryId: categoryId as string,
  accountId: "main",
  paymentMethod: paymentMethod as string,
  status: (type === "INCOME" ? "RECEIVED" : "PAID") as Transaction["status"],
  recurrenceType: "SINGLE" as const,
  createdAt: now,
  updatedAt: now,
})).map((transaction): Transaction => transaction.id === "t21" ? { ...transaction, description: "Transferência para Viagem de fim de ano", sourceAccountId: "main", destinationPiggyBankId: "p1" } : transaction);
export const mockDatabase: {
  transactions: Transaction[];
  accounts: Account[];
  piggyBanks: PiggyBank[];
  groups: Group[];
  budgets: Budget[];
  creditCards: {
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
  }[];
  notifications: {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    actionUrl?: string;
  }[];
  profiles: Profile[];
  friendRequests: FriendRequest[];
  friendships: Friendship[];
  conversations: Conversation[];
  conversationMembers: ConversationMember[];
  messages: Message[];
} = {
  transactions: [
    {
      id: "t1",
      userId: "u-joao",
      type: "INCOME",
      nature: "PERSONAL",
      description: "Salário mensal",
      amount: 6500,
      date: "2026-08-05",
      categoryId: "salary",
      accountId: "main",
      paymentMethod: "TRANSFER",
      status: "RECEIVED",
      recurrenceType: "RECURRING",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "t2",
      userId: "u-joao",
      type: "INCOME",
      nature: "PERSONAL",
      description: "Freelance",
      amount: 1000,
      date: "2026-08-16",
      categoryId: "freelance",
      accountId: "main",
      paymentMethod: "PIX",
      status: "RECEIVED",
      recurrenceType: "SINGLE",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "t3",
      userId: "u-joao",
      type: "EXPENSE",
      nature: "PERSONAL",
      description: "Aluguel",
      amount: 1450,
      date: "2026-08-02",
      categoryId: "housing",
      accountId: "main",
      paymentMethod: "PIX",
      status: "PAID",
      recurrenceType: "RECURRING",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "t4",
      userId: "u-joao",
      type: "EXPENSE",
      nature: "CREDIT_CARD",
      description: "Notebook Pro",
      amount: 399.9,
      date: "2026-08-12",
      categoryId: "education",
      accountId: "card-main",
      paymentMethod: "CREDIT",
      status: "PAID",
      recurrenceType: "INSTALLMENT",
      installmentNumber: 3,
      installmentCount: 12,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "t5",
      userId: "u-joao",
      type: "EXPENSE",
      nature: "PERSONAL",
      description: "Internet",
      amount: 119.9,
      date: "2026-09-03",
      categoryId: "housing",
      accountId: "main",
      paymentMethod: "BOLETO",
      status: "PENDING",
      recurrenceType: "RECURRING",
      createdAt: now,
      updatedAt: now,
    },
    ...transactionHistory,
  ],
  accounts: [
    { id: "main", userId: "u-joao", name: "Conta principal", type: "CHECKING", initialBalance: 12000, createdAt: now, updatedAt: now },
    { id: "wallet", userId: "u-joao", name: "Carteira", type: "CASH", initialBalance: 420, createdAt: now, updatedAt: now },
  ],
  piggyBanks: [
    {
      id: "p1",
      userId: "u-joao",
      name: "Viagem de fim de ano",
      description: "Chapada dos Veadeiros",
      targetAmount: 6000,
      currentAmount: 3150,
      initialAmount: 2600,
      monthlyContribution: 550,
      deadline: "2026-12-15",
      icon: "Plane",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
      movements: [
        {
          id: "pm1",
          piggyBankId: "p1",
          userId: "u-joao",
          type: "DEPOSIT",
          amount: 550,
          date: "2026-08-25",
          description: "Conta principal → Viagem de fim de ano",
          accountId: "main",
          transactionId: "t21",
          createdAt: now,
        },
      ],
    },
  ],
  groups: [
    {
      id: "g1",
      ownerId: "u-joao",
      name: "Viagem para Jericoacoara",
      description: "Viagem da turma",
      type: "TRIP",
      targetAmount: 10000,
      initialFundAmount: 5600,
      eventDate: "2026-11-12",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
      members: [
        {
          id: "gm1",
          groupId: "g1",
          userId: "u-joao",
          name: "João",
          role: "OWNER",
          expectedContribution: 2500,
          joinedAt: now,
          status: "ACTIVE",
          balance: -380,
        },
        {
          id: "gm2",
          groupId: "g1",
          userId: "u-maria",
          name: "Maria",
          role: "MEMBER",
          expectedContribution: 2500,
          joinedAt: now,
          status: "ACTIVE",
          balance: 300,
        },
        {
          id: "gm3",
          groupId: "g1",
          userId: "u-lucas",
          name: "Lucas",
          role: "MEMBER",
          expectedContribution: 2500,
          joinedAt: now,
          status: "ACTIVE",
          balance: 80,
        },
      ],
      contributions: [],
      expenses: [
        {
          id: "ge1",
          groupId: "g1",
          description: "Hospedagem em Jeri",
          amount: 1200,
          paidByUserId: "u-joao",
          date: "2026-08-24",
          category: "Hospedagem",
          splitType: "EQUAL",
          paymentSource: "MEMBER",
          splits: [
            {
              id: "ges1",
              expenseId: "ge1",
              userId: "u-joao",
              amount: 400,
              status: "PENDING",
            },
            {
              id: "ges2",
              expenseId: "ge1",
              userId: "u-maria",
              amount: 400,
              status: "PENDING",
            },
            {
              id: "ges3",
              expenseId: "ge1",
              userId: "u-lucas",
              amount: 400,
              status: "PENDING",
            },
          ],
          createdAt: now,
        },
      ],
      settlements: [],
    },
  ],
  budgets: [
    {
      id: "b1",
      userId: "u-joao",
      categoryId: "food",
      limitAmount: 1100,
      currentAmount: 932,
      period: "MONTHLY",
      referenceMonth: "2026-08",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "b2",
      userId: "u-joao",
      categoryId: "leisure",
      limitAmount: 400,
      currentAmount: 445,
      period: "MONTHLY",
      referenceMonth: "2026-08",
      createdAt: now,
      updatedAt: now,
    },
  ],
  creditCards: [
    {
      id: "card-main",
      userId: "u-joao",
      name: "Cartão principal",
      brand: "Mastercard",
      lastFourDigits: "4582",
      limit: 5000,
      closingDay: 4,
      dueDay: 11,
      color: "#a78bfa",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ],
  notifications: [
    {
      id: "n1",
      userId: "u-joao",
      type: "BILL_DUE",
      title: "Fatura próxima",
      message: "A fatura vence em 11 dias.",
      read: false,
      createdAt: now,
      actionUrl: "/cards",
    },
    {
      id: "n2",
      userId: "u-joao",
      type: "BUDGET_WARNING",
      title: "Orçamento em alerta",
      message: "Alimentação chegou a 85% do orçamento.",
      read: false,
      createdAt: now,
      actionUrl: "/budgets",
    },
    {
      id: "n3",
      userId: "u-joao",
      type: "GOAL_PROGRESS",
      title: "Meta avançando",
      message: "Sua viagem já chegou à metade.",
      read: false,
      createdAt: now,
      actionUrl: "/piggy-banks",
    },
  ],
  profiles: [
    { id: "u-joao", displayName: "João Braga", username: "joaobraga", bio: "Organizando a vida financeira e a próxima viagem.", email: "joao@cofrin.app", createdAt: now, updatedAt: now },
    { id: "u-maria", displayName: "Maria Silva", username: "maria", bio: "Planejando bons momentos com as pessoas certas.", email: "maria@cofrin.app", createdAt: now, updatedAt: now },
    { id: "u-lucas", displayName: "Lucas Costa", username: "lucas", bio: "Sempre pronto para a próxima aventura.", email: "lucas@cofrin.app", createdAt: now, updatedAt: now },
    { id: "u-ana", displayName: "Ana Ribeiro", username: "ana.r", bio: "Metas pequenas também contam.", email: "ana@cofrin.app", createdAt: now, updatedAt: now },
  ],
  friendRequests: [
    { id: "fr-maria-joao", senderId: "u-maria", receiverId: "u-joao", status: "PENDING", createdAt: now, updatedAt: now },
  ],
  friendships: [
    { id: "friend-joao-lucas", userA: "u-joao", userB: "u-lucas", createdAt: now },
  ],
  conversations: [
    { id: "c-direct-lucas", type: "DIRECT", createdAt: now, updatedAt: now },
    { id: "c-group-g1", type: "GROUP", groupId: "g1", createdAt: now, updatedAt: now },
  ],
  conversationMembers: [
    { conversationId: "c-direct-lucas", userId: "u-joao", joinedAt: now, lastReadAt: now },
    { conversationId: "c-direct-lucas", userId: "u-lucas", joinedAt: now },
    { conversationId: "c-group-g1", userId: "u-joao", joinedAt: now, lastReadAt: now },
    { conversationId: "c-group-g1", userId: "u-maria", joinedAt: now },
    { conversationId: "c-group-g1", userId: "u-lucas", joinedAt: now },
  ],
  messages: [
    { id: "m-lucas-1", conversationId: "c-direct-lucas", senderId: "u-lucas", content: "Fechamos os detalhes da viagem hoje?", createdAt: "2026-08-30T18:20:00.000Z" },
    { id: "m-jeri-1", conversationId: "c-group-g1", senderId: "u-maria", content: "Já olhei o hotel. Está dentro do orçamento.", createdAt: "2026-08-30T15:10:00.000Z" },
    { id: "m-jeri-2", conversationId: "c-group-g1", senderId: "u-lucas", content: "Consigo fazer a contribuição amanhã.", createdAt: "2026-08-30T15:18:00.000Z" },
  ],
};
