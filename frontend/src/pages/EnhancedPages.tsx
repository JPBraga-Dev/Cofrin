import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays,
  Car,
  Check,
  ChevronLeft,
  CreditCard,
  Download,
  Gift,
  GraduationCap,
  Heart,
  House,
  Plane,
  Plus,
  LogOut,
  KeyRound,
  MonitorSmartphone,
  Shield,
  Target,
  Users,
  WalletCards,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  ChoiceCard,
  CurrencyInput,
  Drawer,
  DrawerFooter,
  DrawerHeader,
  EmptyState,
  FormHint,
  FormSection,
  MoneyValue,
  PageHeader,
  Progress,
  SegmentedControl,
  UserAvatar,
} from "../components/ui";
import { useAppData } from "../providers/AppDataProvider";
import { useAuth } from "../providers/AuthProvider";
import { ApiError } from "../services/api";
import type { AuthSession } from "../types";
import { GroupConversationPanel } from "./SocialPages";
import {
  budgetFormSchema,
  groupFormSchema,
  piggyFormSchema,
  transactionFormSchema,
} from "../services/schemas";
import type {
  Group,
  PiggyBank,
  Transaction,
  TransactionInput,
  TransactionType,
} from "../types";
import {
  budgetStatus,
  formatCurrency,
  formatDate,
  formatShortDate,
  percent,
} from "../utils/format";
import {
  accountName,
  budgetSpent,
  cardInvoiceSummary,
  categoryName,
  groupLabel,
  initials,
  piggyTotal,
  spendingByCategory,
  groupFundValue,
  transactionTotals,
} from "../utils/selectors";

const today = () => new Date().toISOString().slice(0, 10);
const piggyIconOptions = [
  { value: "Plane", label: "Viagem", icon: Plane },
  { value: "Wallet", label: "Reserva", icon: WalletCards },
  { value: "House", label: "Casa", icon: House },
  { value: "Shield", label: "Segurança", icon: Shield },
  { value: "Car", label: "Carro", icon: Car },
  { value: "GraduationCap", label: "Estudos", icon: GraduationCap },
  { value: "Heart", label: "Pessoal", icon: Heart },
  { value: "Target", label: "Meta", icon: Target },
] as const;
const cardColorClass = (color?: string) =>
  ["carbon", "graphite", "green", "gold", "wine"].includes(color ?? "")
    ? color!
    : "carbon";
function PiggyIcon({ value }: { value?: string }) {
  const option = piggyIconOptions.find((item) => item.value === value);
  const Icon = option?.icon;
  return Icon ? <Icon size={20} /> : <Target size={20} />;
}
const field = (
  label: string,
  value: string,
  set: (value: string) => void,
  type = "text",
) => (
  <div className="form-field">
    <label>{label}</label>
    <input
      type={type}
      value={value}
      onChange={(event) => set(event.target.value)}
    />
  </div>
);

function Status({ status }: { status: Transaction["status"] }) {
  const labels = { PAID: "Pago", RECEIVED: "Recebido", PENDING: "Pendente", OVERDUE: "Atrasado" };
  const tone = status === "OVERDUE" ? "red" : status === "PENDING" ? "gold" : "green";
  return <Badge tone={tone}>{labels[status]}</Badge>;
}

export function EnhancedTransactions() {
  const {
    transactions,
    accounts,
    hidden,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    pending,
  } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [type, setType] = useState<"ALL" | TransactionType>("ALL");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setOpen(true);
      setEditing(null);
    }
  }, [searchParams]);
  const shown = useMemo(
    () =>
      transactions.filter(
        (item) =>
          (type === "ALL" || item.type === type) &&
          `${item.description} ${categoryName(item.categoryId)} ${accountName(item.accountId)}`
            .toLocaleLowerCase("pt-BR")
            .includes(search.toLocaleLowerCase("pt-BR")),
      ),
    [transactions, search, type],
  );
  const totals = transactionTotals(transactions);
  const transactionToDelete = transactions.find(
    (item) => item.id === confirmId,
  );
  const close = () => {
    setOpen(false);
    setEditing(null);
    if (searchParams.get("new")) {
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  };
  const save = async (draft: TransactionInput, id?: string) => {
    if (id) await updateTransaction(id, draft);
    else await createTransaction(draft);
    close();
  };
  return (
    <>
      <PageHeader
        title="Lançamentos"
        description="Registre, filtre e atualize cada movimentação."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus size={16} />
            Novo lançamento
          </Button>
        }
      />
      <div className="summary-strip">
        <div>
          <span>Entradas</span>
          <MoneyValue amount={totals.income} type="income" hidden={hidden} />
        </div>
        <div>
          <span>Saídas</span>
          <MoneyValue amount={totals.expense} type="expense" hidden={hidden} />
        </div>
        <div>
          <span>Saldo</span>
          <MoneyValue amount={totals.income - totals.expense} hidden={hidden} />
        </div>
      </div>
      <Card>
        <div className="filters">
          <input
            placeholder="Buscar lançamentos"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
          >
            <option value="ALL">Todos os tipos</option>
            <option value="INCOME">Receitas</option>
            <option value="EXPENSE">Despesas</option>
            <option value="TRANSFER">Transferências</option>
          </select>
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setType("ALL");
              setSearchParams({}, { replace: true });
            }}
          >
            Limpar filtros
          </Button>
        </div>
        {shown.length ? (
          <div className="table-wrap">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Data</th>
                  <th>Conta</th>
                  <th>Status</th>
                  <th>Valor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.description}</strong>
                      {item.installmentNumber && (
                        <small>
                          {" "}
                          · {item.installmentNumber}/{item.installmentCount}
                        </small>
                      )}
                    </td>
                    <td>{item.type === "TRANSFER" ? "Transferência" : categoryName(item.categoryId)}</td>
                    <td>{formatDate(item.date)}</td>
                    <td>{accountName(item.accountId)}</td>
                    <td>
                      <Status status={item.status} />
                    </td>
                    <td>
                      <MoneyValue
                        amount={item.amount}
                        type={
                          item.type === "INCOME"
                            ? "income"
                            : item.type === "EXPENSE"
                              ? "expense"
                              : undefined
                        }
                        hidden={hidden}
                      />
                    </td>
                    <td>
                      {item.type !== "TRANSFER" && <Button
                        variant="ghost"
                        aria-expanded={actionId === item.id}
                        onClick={() =>
                          setActionId(actionId === item.id ? null : item.id)
                        }
                      >
                        •••
                      </Button>}
                      {item.type !== "TRANSFER" && actionId === item.id && (
                        <div className="inline-actions">
                          <button
                            onClick={() => {
                              setEditing(item);
                              setOpen(true);
                              setActionId(null);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              void createTransaction({
                                description: `${item.description} (cópia)`,
                                amount: item.amount,
                                type: item.type,
                                date: today(),
                                categoryId: item.categoryId,
                                accountId: item.accountId,
                                paymentMethod: item.paymentMethod,
                                status: item.status,
                                nature: item.nature,
                                recurrenceType: "SINGLE",
                              });
                              setActionId(null);
                            }}
                          >
                            Duplicar
                          </button>
                          {item.status === "PENDING" && (
                            <button
                              onClick={() => {
                                void updateTransaction(item.id, {
                                  status:
                                    item.type === "INCOME"
                                      ? "RECEIVED"
                                      : "PAID",
                                });
                                setActionId(null);
                              }}
                            >
                              Marcar pago
                            </button>
                          )}
                          <button
                            className="danger"
                            onClick={() => {
                              setConfirmId(item.id);
                              setActionId(null);
                            }}
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Nenhum lançamento encontrado"
            detail="Altere os filtros ou crie um lançamento."
          />
        )}
      </Card>
      <TransactionDrawer
        open={open}
        close={close}
        initial={editing}
        defaultCategory={searchParams.get("category") ?? undefined}
        defaultDate={searchParams.get("date") ?? undefined}
        save={save}
        loading={pending.mutation ?? false}
      />
      {confirmId && (
        <Drawer open onClose={() => setConfirmId(null)}>
          <DrawerHeader
            eyebrow="Ação destrutiva"
            title="Excluir lançamento?"
            description="Essa ação remove o lançamento do Cofrin e atualiza os resumos financeiros."
          />
          {transactionToDelete && (
            <div className="live-summary">
              <strong>{transactionToDelete.description}</strong>
              <div className="impact-grid">
                <div>
                  <span>Valor</span>
                  {formatCurrency(transactionToDelete.amount, hidden)}
                </div>
                <div>
                  <span>Categoria</span>
                  {categoryName(transactionToDelete.categoryId)}
                </div>
              </div>
            </div>
          )}
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setConfirmId(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={pending.mutation}
              onClick={async () => {
                await deleteTransaction(confirmId);
                setConfirmId(null);
              }}
            >
              Excluir
            </Button>
          </div>
        </Drawer>
      )}
    </>
  );
}

function TransactionDrawer({
  open,
  close,
  initial,
  defaultCategory,
  defaultDate,
  save,
  loading,
}: {
  open: boolean;
  close: () => void;
  initial: Transaction | null;
  defaultCategory?: string;
  defaultDate?: string;
  save: (value: TransactionInput, id?: string) => Promise<void>;
  loading: boolean;
}) {
  const { cards, accounts } = useAppData();
  const [draft, setDraft] = useState<TransactionInput>({
    description: "",
    amount: 0,
    type: "EXPENSE",
    date: today(),
    categoryId: "other",
    accountId: "main",
    paymentMethod: "PIX",
    nature: "PERSONAL",
    recurrenceType: "SINGLE",
  });
  const [error, setError] = useState("");
  useEffect(() => {
    setError("");
    setDraft(
      initial
        ? {
            description: initial.description,
            amount: initial.amount,
            type: initial.type,
            date: initial.date,
            categoryId: initial.categoryId,
            accountId: initial.accountId,
            paymentMethod: initial.paymentMethod,
            status: initial.status,
            nature: initial.nature,
            recurrenceType: initial.recurrenceType,
          }
        : {
            description: "",
            amount: 0,
            type: "EXPENSE",
            date: defaultDate ?? today(),
            categoryId: defaultCategory ?? "other",
            accountId: "main",
            paymentMethod: "PIX",
            nature: "PERSONAL",
            recurrenceType: "SINGLE",
          },
    );
  }, [initial, open, defaultCategory, defaultDate]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = transactionFormSchema.safeParse({
      description: draft.description,
      amount: draft.amount,
      date: draft.date,
      category: draft.categoryId,
      type: draft.type,
    });
    if (!validation.success)
      return setError(validation.error.issues[0].message);
    await save(draft, initial?.id);
  };
  const installmentCount = Number(draft.installmentCount ?? 1);
  const isInstallment = draft.recurrenceType === "INSTALLMENT";
  const accountOptions = [
    ...accounts.map((account) => ({ id: account.id, label: account.name })),
    ...cards.map((card) => ({
      id: card.id,
      label: `${card.name} •••• ${card.lastFourDigits}`,
    })),
  ];
  return (
    <Drawer open={open} onClose={close}>
      <DrawerHeader
        eyebrow={initial ? "Lançamento existente" : "Movimentação financeira"}
        title={initial ? "Editar lançamento" : "Novo lançamento"}
        description="O resultado será refletido no Dashboard, Relatórios, Calendário e Orçamentos."
      />
      <form onSubmit={(event) => void submit(event)}>
        <FormSection title="Tipo de lançamento">
          <SegmentedControl
            value={draft.type}
            onChange={(type) => setDraft({ ...draft, type })}
            options={[
              { value: "EXPENSE", label: "Despesa", tone: "red" },
              { value: "INCOME", label: "Receita", tone: "green" },
            ]}
          />
        </FormSection>
        <FormSection title="Detalhes principais">
          <div className="form-field">
            <label>Descrição</label>
            <input
              autoFocus
              value={draft.description}
              placeholder={
                "Ex.: Notebook"
              }
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
            />
          </div>
          <div className="form-field">
            <label>Valor</label>
            <CurrencyInput
              value={String(draft.amount || "")}
              placeholder="0,00"
              onChange={(amount) =>
                setDraft({ ...draft, amount: Number(amount.replace(",", ".")) })
              }
            />
          </div>
          <div className="form-field">
            <label>Data</label>
            <input
              type="date"
              value={draft.date}
              onChange={(event) =>
                setDraft({ ...draft, date: event.target.value })
              }
            />
          </div>
        </FormSection>
        <FormSection title="Como essa movimentação será organizada">
          <div className="form-field">
            <label>Categoria</label>
            <select
              value={draft.categoryId}
              onChange={(event) =>
                setDraft({ ...draft, categoryId: event.target.value })
              }
            >
              {[
                "other",
                "food",
                "housing",
                "transport",
                "health",
                "subscriptions",
                "leisure",
                "education",
                "salary",
                "freelance",
              ].map((id) => (
                <option key={id} value={id}>
                  {categoryName(id)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>
              {draft.type === "INCOME"
                ? "Conta de destino"
                : "Conta ou cartão"}
            </label>
            <select
              value={draft.accountId}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  accountId: event.target.value,
                  nature:
                    event.target.value === "card-main"
                      ? "CREDIT_CARD"
                      : "PERSONAL",
                })
              }
            >
              {accountOptions.map((account) => (
                <option value={account.id} key={account.id}>
                  {account.label}
                </option>
              ))}
            </select>
          </div>
          {draft.type === "EXPENSE" && (
            <div className="form-field">
              <label>Recorrência</label>
              <SegmentedControl
                value={draft.recurrenceType ?? "SINGLE"}
                onChange={(recurrenceType) =>
                  setDraft({ ...draft, recurrenceType })
                }
                options={[
                  { value: "SINGLE", label: "Único" },
                  { value: "RECURRING", label: "Recorrente" },
                  { value: "INSTALLMENT", label: "Parcelado", tone: "gold" },
                ]}
              />
            </div>
          )}
          {isInstallment && (
            <div className="form-field">
              <label>Número de parcelas</label>
              <select
                value={installmentCount}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    installmentCount: Number(event.target.value),
                    installmentNumber: 1,
                  })
                }
              >
                {Array.from({ length: 24 }, (_, index) => index + 2).map(
                  (count) => (
                    <option key={count} value={count}>
                      {count}x
                    </option>
                  ),
                )}
              </select>
              <FormHint>
                {formatCurrency(draft.amount / installmentCount)} em cada
                parcela, aproximadamente.
              </FormHint>
            </div>
          )}
        </FormSection>
        <div className="live-summary">
          <h4>Resumo antes de confirmar</h4>
          <strong>
            {draft.type === "EXPENSE"
              ? "Despesa"
              : draft.type === "INCOME"
                ? "Receita"
                : "Transferência"}
          </strong>
          <div className="impact-grid">
            <div>
              <span>Descrição</span>
              {draft.description || "Ainda sem descrição"}
            </div>
            <div>
              <span>Valor</span>
              {formatCurrency(draft.amount)}
            </div>
          </div>
          {isInstallment && (
            <p>
              {installmentCount} parcelas de aproximadamente{" "}
              {formatCurrency(draft.amount / installmentCount)}.
            </p>
          )}
        </div>
        {error && <p className="form-error">{error}</p>}
        <DrawerFooter
          onCancel={close}
          submitLabel={initial ? "Salvar alterações" : "Criar lançamento"}
          loading={loading}
        />
      </form>
    </Drawer>
  );
}

export function EnhancedPiggyBanks() {
  const { piggies, hidden, createPiggy, pending } = useAppData();
  const navigate = useNavigate();
  const [create, setCreate] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    targetAmount: "",
    monthlyContribution: "",
    deadline: "",
    icon: "Target",
  });
  const total = piggyTotal(piggies);
  const submit = async () => {
    const data = {
      name: draft.name,
      description: draft.description,
      targetAmount: Number(draft.targetAmount),
      monthlyContribution: Number(draft.monthlyContribution || 0),
      deadline: draft.deadline || undefined,
      icon: draft.icon,
    };
    const check = piggyFormSchema.safeParse({
      ...data,
      deadline: draft.deadline || today(),
    });
    if (!check.success) return;
    const item = await createPiggy(data);
    setHighlightId(item.id);
    setCreate(false);
    window.setTimeout(() => setHighlightId(null), 1000);
  };
  return (
    <>
      <PageHeader
        eyebrow="Metas pessoais"
        title="Porquinhos"
        description="Transforme intenções em reservas reais."
        action={
          <Button onClick={() => setCreate(true)}>
            <Plus size={16} />
            Criar porquinho
          </Button>
        }
      />
      <div className="summary-strip">
        <div>
          <span>Total guardado</span>
          <MoneyValue amount={total} hidden={hidden} />
        </div>
        <div>
          <span>Metas ativas</span>
          <strong>
            {piggies.filter((item) => item.status === "ACTIVE").length}
          </strong>
        </div>
        <div>
          <span>Concluídas</span>
          <strong>
            {piggies.filter((item) => item.status === "COMPLETED").length}
          </strong>
        </div>
      </div>
      <div className="piggy-grid">
        {piggies.map((item) => (
          <Card
            className={`piggy-card ${highlightId === item.id ? "item-highlight" : ""}`}
            key={item.id}
          >
            <article role="link" tabIndex={0} onClick={() => navigate(`/piggy-banks/${item.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate(`/piggy-banks/${item.id}`); } }}>
            <div className="piggy-icon">
              <PiggyIcon value={item.icon} />
            </div>
            <h2>{item.name}</h2>
            <p>{item.description}</p>
            <div className="piggy-amounts">
              <MoneyValue amount={item.currentAmount} hidden={hidden} />
              <span>de {formatCurrency(item.targetAmount, hidden)}</span>
            </div>
            <Progress
              value={percent(item.currentAmount, item.targetAmount)}
              color={item.status === "COMPLETED" ? "#f5c451" : "#4ade80"}
            />
            <div className="piggy-meta">
              <span>
                {item.currentAmount >= item.targetAmount ? "Meta concluída" : `${percent(item.currentAmount, item.targetAmount)}% concluído`}
              </span>
              <span>
                {item.deadline
                  ? `até ${formatShortDate(item.deadline)}`
                  : "Sem prazo"}
              </span>
            </div>
            {item.currentAmount > item.targetAmount && <p className="piggy-over-target">{formatCurrency(item.currentAmount - item.targetAmount, hidden)} acima da meta</p>}
            </article>
          </Card>
        ))}
      </div>
      <Drawer open={create} onClose={() => setCreate(false)}>
        <DrawerHeader
          eyebrow="Metas pessoais"
          title="Criar porquinho"
          description="Defina o objetivo e veja como a reserva vai evoluir antes de criá-la."
        />
        <FormSection title="Objetivo">
          <div className="form-field">
            <label>Nome</label>
            <input
              autoFocus
              value={draft.name}
              placeholder="Ex.: Viagem"
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
          </div>
          <div className="form-field">
            <label>Descrição</label>
            <textarea
              value={draft.description}
              placeholder="Para que serve esta reserva?"
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
            />
          </div>
          <div className="form-field">
            <label>Ícone</label>
            <div className="choice-grid compact">
              {piggyIconOptions.map(({ value, label, icon: Icon }) => (
                <ChoiceCard
                  key={value}
                  title={label}
                  icon={<Icon size={16} />}
                  selected={draft.icon === value}
                  onClick={() => setDraft({ ...draft, icon: value })}
                />
              ))}
            </div>
          </div>
        </FormSection>
        <FormSection
          title="Meta"
          description="Você poderá guardar ou retirar dinheiro pela tela de detalhe."
        >
          <div className="form-field">
            <label>Valor-meta</label>
            <CurrencyInput
              value={draft.targetAmount}
              placeholder="6.000"
              onChange={(targetAmount) => setDraft({ ...draft, targetAmount })}
            />
          </div>
          <div className="form-field">
            <label>Prazo</label>
            <input
              type="date"
              value={draft.deadline}
              onChange={(event) =>
                setDraft({ ...draft, deadline: event.target.value })
              }
            />
          </div>
        </FormSection>
        <FormSection
          title="Ritmo"
          description="Sem juros: a previsão considera apenas o valor mensal planejado."
        >
          <div className="form-field">
            <label>Valor mensal planejado</label>
            <CurrencyInput
              value={draft.monthlyContribution}
              placeholder="500"
              onChange={(monthlyContribution) =>
                setDraft({ ...draft, monthlyContribution })
              }
            />
          </div>
        </FormSection>
        <div className="live-summary">
          <h4>Preview do porquinho</h4>
          <div className="piggy-amounts">
            <strong>{draft.name || "Nova meta"}</strong>
            <span>
              {draft.targetAmount
                ? `Meta de ${formatCurrency(Number(draft.targetAmount))}`
                : "Defina uma meta"}
            </span>
          </div>
          <Progress value={0} color="#4ade80" />
          <p>
            {Number(draft.monthlyContribution) > 0 &&
            Number(draft.targetAmount) > 0
              ? `Estimativa: aproximadamente ${Math.ceil(Number(draft.targetAmount) / Number(draft.monthlyContribution))} meses.`
              : "Estimativa: defina meta e valor mensal para calcular o prazo."}
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <DrawerFooter
            onCancel={() => setCreate(false)}
            submitLabel="Criar porquinho"
            loading={pending.mutation}
          />
        </form>
      </Drawer>
    </>
  );
}

export function PiggyBankDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { piggies, accounts, transactions, hidden, movePiggy, pending } = useAppData();
  const piggy = piggies.find((item) => item.id === id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [direction, setDirection] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  if (!piggy) return <EmptyState title="Porquinho não encontrado" detail="Essa reserva pode ter sido removida." />;
  const account = accounts.find((item) => item.id === accountId);
  const numericAmount = Number(amount || 0);
  const available = direction === "DEPOSIT" ? account?.balance ?? 0 : piggy.currentAmount;
  const invalidAmount = numericAmount <= 0 || numericAmount > available;
  const nextPiggy = piggy.currentAmount + (direction === "DEPOSIT" ? numericAmount : -numericAmount);
  const nextAccount = account ? account.balance + (direction === "DEPOSIT" ? -numericAmount : numericAmount) : 0;
  const overTarget = piggy.currentAmount - piggy.targetAmount;
  const history = transactions.filter((item) => item.destinationPiggyBankId === piggy.id || item.sourcePiggyBankId === piggy.id);
  const begin = (nextDirection: "DEPOSIT" | "WITHDRAWAL") => { setDirection(nextDirection); setAccountId(""); setAmount(""); setDrawerOpen(true); };
  const submit = async () => {
    if (!account || invalidAmount) return;
    await movePiggy(piggy.id, account.id, numericAmount, direction);
    setDrawerOpen(false); setAmount(""); setAccountId("");
  };
  return <div className="piggy-detail-page">
    <button className="back-link" onClick={() => navigate("/piggy-banks")}><ChevronLeft size={16} />Porquinhos</button>
    <Card className="piggy-detail-hero"><div className="piggy-icon"><PiggyIcon value={piggy.icon} /></div><div><p className="eyebrow">Meta pessoal</p><h1>{piggy.name}</h1><p>{piggy.description}</p></div><div className="piggy-detail-actions"><Button onClick={() => begin("DEPOSIT")}>Guardar dinheiro</Button><Button variant="secondary" onClick={() => begin("WITHDRAWAL")} disabled={!piggy.currentAmount}>Retirar dinheiro</Button></div></Card>
    <div className="piggy-detail-grid"><Card><p className="eyebrow">Reserva</p><div className="piggy-detail-amount"><span>Guardado</span><MoneyValue amount={piggy.currentAmount} hidden={hidden} size="large" /></div><div className="piggy-detail-amount"><span>Meta</span><strong>{formatCurrency(piggy.targetAmount, hidden)}</strong></div><Progress value={percent(piggy.currentAmount, piggy.targetAmount)} color={piggy.currentAmount >= piggy.targetAmount ? "#f5c451" : "#4ade80"} /><div className="piggy-detail-meta"><strong>{piggy.currentAmount >= piggy.targetAmount ? "Meta concluída" : `${percent(piggy.currentAmount, piggy.targetAmount)}% concluído`}</strong>{piggy.deadline && <span>{formatShortDate(piggy.deadline)}</span>}</div>{overTarget > 0 && <p className="piggy-over-target">{formatCurrency(overTarget, hidden)} acima da meta</p>}</Card><Card className="piggy-history"><div className="section-heading"><div><h2>Movimentações</h2><p>Transferências reais desta reserva.</p></div></div>{history.length ? history.map((movement) => { const incoming = movement.destinationPiggyBankId === piggy.id; return <div className="bill-row" key={movement.id}><span className={incoming ? "transfer-in" : "transfer-out"}>{incoming ? "+" : "−"}</span><div className="bill-info"><strong>{movement.description}</strong><small>{formatDate(movement.date)}</small></div><MoneyValue amount={movement.amount} type={incoming ? "income" : "expense"} hidden={hidden} size="small" /></div>; }) : <EmptyState title="Nenhuma transferência ainda" detail="Guarde dinheiro a partir de uma conta para iniciar esta reserva." />}</Card></div>
    <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}><DrawerHeader eyebrow="Transferência interna" title={direction === "DEPOSIT" ? "Guardar dinheiro" : "Retirar dinheiro"} description={direction === "DEPOSIT" ? `Destino: ${piggy.name}` : `Origem: ${piggy.name}`} />{direction === "DEPOSIT" && piggy.currentAmount >= piggy.targetAmount && <p className="transfer-note">Sua meta já foi atingida. Você pode guardar mais dinheiro se quiser aumentar a reserva.</p>}<FormSection title={direction === "DEPOSIT" ? "De onde vem o dinheiro?" : "Para onde enviar?"}>{accounts.map((item) => <button key={item.id} className={`transfer-account ${accountId === item.id ? "selected" : ""}`} onClick={() => setAccountId(item.id)}><span><strong>{item.name}</strong><small>Disponível: {formatCurrency(item.balance, hidden)}</small></span><Check size={16} /></button>)}</FormSection>{account && <><FormSection title={direction === "DEPOSIT" ? "Quanto deseja guardar?" : "Quanto deseja retirar?"}><div className="transfer-available">{direction === "DEPOSIT" ? `${account.name}: ${formatCurrency(account.balance, hidden)} disponíveis` : `${piggy.name}: ${formatCurrency(piggy.currentAmount, hidden)} disponíveis`}</div><CurrencyInput value={amount} placeholder="0,00" onChange={setAmount} />{numericAmount > available && <p className="form-error">Saldo insuficiente nesta conta.</p>}</FormSection>{numericAmount > 0 && !invalidAmount && <div className="transfer-preview"><p className="eyebrow">Resumo</p><div><span>{direction === "DEPOSIT" ? account.name : piggy.name}</span><strong>{formatCurrency(direction === "DEPOSIT" ? account.balance : piggy.currentAmount, hidden)} → {formatCurrency(direction === "DEPOSIT" ? nextAccount : nextPiggy, hidden)}</strong></div><div><span>{direction === "DEPOSIT" ? piggy.name : account.name}</span><strong>{formatCurrency(direction === "DEPOSIT" ? piggy.currentAmount : account.balance, hidden)} → {formatCurrency(direction === "DEPOSIT" ? nextPiggy : nextAccount, hidden)}</strong></div>{direction === "WITHDRAWAL" && piggy.currentAmount >= piggy.targetAmount && nextPiggy < piggy.targetAmount && <p className="transfer-note">Esta retirada fará a meta deixar de estar concluída.</p>}</div>}</>}<DrawerFooter onCancel={() => setDrawerOpen(false)} submitLabel={direction === "DEPOSIT" ? `Guardar ${numericAmount > 0 ? formatCurrency(numericAmount) : "dinheiro"}` : `Retirar ${numericAmount > 0 ? formatCurrency(numericAmount) : "dinheiro"}`} loading={pending.mutation} disabled={!account || invalidAmount} onSubmit={submit} /></Drawer>
  </div>;
}

export function EnhancedGroups() {
  const { groups, hidden, createGroup, pending, friends, profile } = useAppData();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<Group["type"]>("TRIP");
  const [participants, setParticipants] = useState<string[]>([]);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const participantOptions = friends;
  const toggleParticipant = (id: string) =>
    setParticipants((items) =>
      items.includes(id)
          ? items.filter((item) => item !== id)
          : [...items, id],
    );
  return (
    <>
      <PageHeader
        eyebrow="Planejamento coletivo"
        title="Grupos"
        description="Metas, contribuições e despesas compartilhadas."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} />
            Criar grupo
          </Button>
        }
      />
      <div className="group-grid">
        {groups.map((group) => {
          const fund =
            (group.initialFundAmount ?? 0) +
            group.contributions
              .filter((item) => item.status === "CONFIRMED")
              .reduce((total, item) => total + item.amount, 0) -
            group.expenses
              .filter((item) => item.paymentSource === "GROUP_FUND")
              .reduce((total, item) => total + item.amount, 0);
          return (
            <article
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/groups/${group.id}`)}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate(`/groups/${group.id}`); } }}
              className={`group-card ${highlightId === group.id ? "item-highlight" : ""}`}
              key={group.id}
            >
              <div className="group-top">
                <div>
                  <span className="group-type-overline">{groupLabel(group.type)}</span>
                  <h2>{group.name}</h2>
                  <p>
                    {""}
                    {group.eventDate
                      ? formatShortDate(group.eventDate)
                      : "Sem data"}
                  </p>
                </div>
              </div>
              <p>{group.description}</p>
              <div className="piggy-amounts">
                <MoneyValue amount={fund} hidden={hidden} />
                <span>
                  {group.targetAmount
                    ? `de ${formatCurrency(group.targetAmount, hidden)}`
                    : "sem meta"}
                </span>
              </div>
              {group.targetAmount && (
                <Progress
                  value={percent(fund, group.targetAmount)}
                  color="#4ade80"
                />
              )}
              <div className="group-footer">
                <div className="avatar-group">
                  {group.members.map((member) => (
                    <button className="avatar" key={member.id} onClick={(event) => { event.stopPropagation(); const username = member.username ?? [...friends, profile].find((item) => item?.id === member.userId)?.username; if (username) navigate(`/u/${username}`); }}>
                      <UserAvatar src={member.avatarUrl} name={member.name} alt="" />
                    </button>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <Drawer open={open} onClose={() => setOpen(false)}>
        <DrawerHeader
          eyebrow="Planejamento compartilhado"
          title="Criar grupo"
          description="Defina a intenção do grupo, quem participa e o que vocês querem construir."
        />
        <FormSection title="Identidade">
          <div className="form-field">
            <label>Nome</label>
            <input
              autoFocus
              value={name}
              placeholder="Ex.: Viagem para Jericoacoara"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Descrição</label>
            <textarea
              value={description}
              placeholder="Conte brevemente o objetivo deste planejamento."
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Tipo</label>
            <div className="choice-grid compact">
              {(
                [
                  { key: "TRIP", icon: Plane },
                  { key: "EVENT", icon: CalendarDays },
                  { key: "HOUSE", icon: House },
                  { key: "GIFT", icon: Gift },
                  { key: "COUPLE", icon: Heart },
                  { key: "GOAL", icon: Target },
                  { key: "OTHER", icon: Users },
                ] as const
              ).map(({ key, icon: Icon }) => (
                <ChoiceCard
                  key={key}
                  title={groupLabel(key)}
                  icon={<Icon size={16} />}
                  selected={type === key}
                  onClick={() => setType(key)}
                />
              ))}
            </div>
          </div>
        </FormSection>
        <FormSection
          title="Planejamento"
          description="Meta e data são opcionais; criar um grupo não altera seu saldo pessoal."
        >
          <div className="form-field">
            <label>Meta financeira</label>
            <CurrencyInput
              value={target}
              placeholder="10.000"
              onChange={setTarget}
            />
            <FormHint>
              {target
                ? `Meta de ${formatCurrency(Number(target))}.`
                : "Sem meta financeira definida."}
            </FormHint>
          </div>
          <div className="form-field">
            <label>Data do planejamento</label>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
        </FormSection>
        <FormSection
          title="Participantes"
          description="Você já será adicionado como organizador. Selecione amigos para este planejamento."
        >
          <div className="choice-grid">
            {participantOptions.map((person) => (
              <ChoiceCard
                key={person.id}
                title={person.displayName}
                description={
                  `@${person.username}`
                }
                selected={participants.includes(person.id)}
                onClick={() => toggleParticipant(person.id)}
              />
            ))}
          </div>
        </FormSection>
        <div className="live-summary">
          <h4>Resumo antes de criar</h4>
          <strong>{name || "Novo planejamento"}</strong>
          <div className="impact-grid">
            <div>
              <span>Tipo</span>
              {groupLabel(type)}
            </div>
            <div>
              <span>Meta</span>
              {target ? formatCurrency(Number(target)) : "Sem meta"}
            </div>
            <div>
              <span>Participantes</span>
              {participants.length}
            </div>
          </div>
          {date && <p>{formatShortDate(date)}</p>}
        </div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const check = groupFormSchema.safeParse({
              name,
              type,
              targetAmount: Number(target || 1),
              eventDate: date || today(),
            });
            if (!check.success) return;
            const item = await createGroup({
              name,
              description: description.trim() || "Planejamento compartilhado.",
              type,
              targetAmount: Number(target) || undefined,
              eventDate: date || undefined,
              participantUserIds: participants,
            });
            setHighlightId(item.id);
            setOpen(false);
            window.setTimeout(() => setHighlightId(null), 1000);
          }}
        >
          <DrawerFooter
            onCancel={() => setOpen(false)}
            submitLabel="Criar grupo"
            loading={pending.mutation}
          />
        </form>
      </Drawer>
    </>
  );
}

const tabs = [
  { key: "overview", label: "Visão geral" },
  { key: "contributions", label: "Contribuições" },
  { key: "expenses", label: "Despesas" },
  { key: "members", label: "Participantes" },
  { key: "settlements", label: "Acertos" },
  { key: "conversation", label: "Conversa" },
] as const;
export function EnhancedGroupDetail() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    groups,
    profile,
    accounts,
    hidden,
    addGroupContribution,
    addGroupExpense,
    markSettlementPaid,
    pending,
  } = useAppData();
  const group = groups.find((item) => item.id === id);
  const tab = tabs.some((item) => item.key === params.get("tab"))
    ? params.get("tab")!
    : "overview";
  const [mode, setMode] = useState<"contribution" | "expense" | null>(null);
  const [amount, setAmount] = useState("");
  const [contributionAccountId, setContributionAccountId] = useState("");
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [contributionError, setContributionError] = useState("");
  const [expenseError, setExpenseError] = useState("");
  const [description, setDescription] = useState("");
  const [splitType, setSplitType] = useState<
    "EQUAL" | "PERCENTAGE" | "SHARES" | "MANUAL"
  >("EQUAL");
  const [paidByUserId, setPaidByUserId] = useState("");
  const [paymentSource, setPaymentSource] = useState<"GROUP_FUND" | "MEMBER">(
    "MEMBER",
  );
  const [expenseCategory, setExpenseCategory] = useState("other");
  const [expenseDate, setExpenseDate] = useState(today());
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, number>>({});
  const [manualAmounts, setManualAmounts] = useState<Record<string, string>>(
    {},
  );
  if (!group)
    return (
      <>
        <PageHeader
          title="Grupo não encontrado"
          description="Volte à lista e escolha outro grupo."
        />
        <Button onClick={() => navigate("/groups")}>Voltar aos grupos</Button>
      </>
    );
  const fund = groupFundValue(group);
  const activeMembers = group.members.filter(
    (member) => member.status === "ACTIVE",
  );
  const currentPayer = paidByUserId || activeMembers[0]?.userId || "";
  const currentUserPays = paymentSource === "MEMBER" && currentPayer === profile?.id;
  const expenseAccount = accounts.find((item) => item.id === expenseAccountId);
  const contributionByMe = group.contributions
    .filter((item) => item.userId === profile?.id && item.status === "CONFIRMED")
    .reduce((total, item) => total + item.amount, 0);
  const operationAmount = Number(amount || 0);
  const contributionAfter = fund + operationAmount;
  const contributionAccount = accounts.find((item) => item.id === contributionAccountId);
  const contributionInvalid = operationAmount <= 0 || !contributionAccount || operationAmount > (contributionAccount?.balance ?? 0);
  const percentageTotal = activeMembers.reduce(
    (total, member, index) =>
      total +
      Number(
        percentages[member.userId] ??
          (index === activeMembers.length - 1
            ? 100 - Math.floor(100 / activeMembers.length) * index
            : Math.floor(100 / activeMembers.length)),
      ),
    0,
  );
  const totalShares = activeMembers.reduce(
    (total, member) => total + Math.max(1, shares[member.userId] ?? 1),
    0,
  );
  const manualTotal = activeMembers.reduce(
    (total, member) => total + Number(manualAmounts[member.userId] ?? 0),
    0,
  );
  const expenseInvalid =
    operationAmount <= 0 ||
    !description.trim() ||
    (paymentSource === "GROUP_FUND" && operationAmount > fund) ||
    (currentUserPays && (!expenseAccount || operationAmount > (expenseAccount?.balance ?? 0))) ||
    (splitType === "PERCENTAGE" && percentageTotal !== 100) ||
    (splitType === "MANUAL" && manualTotal !== operationAmount);
  return (
    <>
      <button className="button ghost" onClick={() => navigate("/groups")}>
        ← Voltar aos grupos
      </button>
      <div className="detail-hero">
        <div>
          <p className="eyebrow">{groupLabel(group.type)}</p>
          <h1>{group.name}</h1>
          <p>
            {group.description}
            {group.eventDate && ` · ${formatDate(group.eventDate)}`}
          </p>
        </div>
        <Button onClick={() => setMode("expense")}>
          <Plus size={15} />
          Registrar despesa
        </Button>
      </div>
      <div className="summary-strip">
        <div>
          <span>Fundo atual</span>
          <MoneyValue amount={fund} hidden={hidden} />
        </div>
        <div>
          <span>Total gasto</span>
          <MoneyValue
            amount={group.expenses.reduce(
              (total, item) => total + item.amount,
              0,
            )}
            type="expense"
            hidden={hidden}
          />
        </div>
        <div>
          <span>Meta</span>
          <MoneyValue amount={group.targetAmount ?? 0} hidden={hidden} />
        </div>
      </div>
      <div className="tabs">
        {tabs.map((item) => (
          <button
            className={tab === item.key ? "active" : ""}
            onClick={() => setParams({ tab: item.key })}
            key={item.key}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <div className="two-col">
          <Card>
            <div className="section-heading">
              <div>
                <h2>Progresso coletivo</h2>
                <p>Fundo arrecadado para o planejamento.</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => setMode("contribution")}
              >
                Registrar contribuição
              </Button>
            </div>
            {group.targetAmount && (
              <>
                <div className="piggy-amounts">
                  <MoneyValue amount={fund} hidden={hidden} />
                  <span>de {formatCurrency(group.targetAmount, hidden)}</span>
                </div>
                <Progress
                  value={percent(fund, group.targetAmount)}
                  color="#4ade80"
                />
              </>
            )}
            <h3 className="drawer-subtitle">Atividade recente</h3>
            {[...group.contributions].slice(0, 4).map((item) => (
              <div className="bill-row" key={item.id}>
                <span>↗</span>
                <div className="bill-info">
                  <strong>
                    {group.members.find(
                      (member) => member.userId === item.userId,
                    )?.name ?? "Participante"}{" "}
                    adicionou uma contribuição
                  </strong>
                  <small>{formatDate(item.date)}</small>
                </div>
                <MoneyValue
                  amount={item.amount}
                  type="income"
                  hidden={hidden}
                  size="small"
                />
              </div>
            ))}
          </Card>
          <Card>
            <h2 style={{ fontSize: 14, marginTop: 0 }}>Progresso individual</h2>
            {group.members.map((member) => (
              <div className="bill-row" key={member.id}>
                <UserAvatar className="avatar" src={member.avatarUrl} name={member.name} alt="" />
                <div className="bill-info">
                  <strong>{member.name}</strong>
                  {member.expectedContribution > 0 ? (
                    <Progress
                      value={percent(
                        group.contributions
                          .filter(
                            (item) =>
                              item.userId === member.userId &&
                              item.status === "CONFIRMED",
                          )
                          .reduce((total, item) => total + item.amount, 0),
                        member.expectedContribution,
                      )}
                      color="#4ade80"
                    />
                  ) : (
                    <small>Sem valor esperado</small>
                  )}
                </div>
                <MoneyValue
                  amount={group.contributions
                    .filter(
                      (item) =>
                        item.userId === member.userId &&
                        item.status === "CONFIRMED",
                    )
                    .reduce((total, item) => total + item.amount, 0)}
                  hidden={hidden}
                  size="small"
                />
              </div>
            ))}
          </Card>
        </div>
      )}
      {tab === "contributions" && (
        <Card>
          <div className="section-heading">
            <div>
              <h2>Contribuições</h2>
              <p>Contribuições planejadas e realizadas do grupo.</p>
            </div>
            <Button onClick={() => { setContributionAccountId(""); setContributionError(""); setAmount(""); setMode("contribution"); }}>
              Contribuir
            </Button>
          </div>
          {group.contributions.map((item) => (
            <div className="bill-row" key={item.id}>
              <div className="avatar">
                {initials(
                  group.members.find((member) => member.userId === item.userId)
                    ?.name ?? "?",
                )}
              </div>
              <div className="bill-info">
                <strong>
                  {group.members.find((member) => member.userId === item.userId)
                    ?.name ?? "Participante"}
                </strong>
                <small>{formatDate(item.date)} · {item.status === "CONFIRMED" ? "Realizada" : "Planejada"}</small>
              </div>
              <MoneyValue amount={item.amount} type={item.status === "CONFIRMED" ? "income" : undefined} hidden={hidden} />
            </div>
          ))}
        </Card>
      )}
      {tab === "expenses" && (
        <Card>
          <div className="section-heading">
            <div>
              <h2>Despesas compartilhadas</h2>
              <p>
                O pagador recebe crédito e cada participante assume a sua parte.
              </p>
            </div>
            <Button onClick={() => setMode("expense")}>Nova despesa</Button>
          </div>
          {group.expenses.map((item) => (
            <div className="bill-row" key={item.id}>
              <span>◫</span>
              <div className="bill-info">
                <strong>{item.description}</strong>
                <small>
                  {item.category} · {formatDate(item.date)}
                </small>
              </div>
              <MoneyValue amount={item.amount} type="expense" hidden={hidden} />
            </div>
          ))}
        </Card>
      )}
      {tab === "members" && (
        <Card>
          <div className="members-grid">
            {group.members.map((member) => (
              <div className="member-row" key={member.id}>
                <UserAvatar className="avatar" src={member.avatarUrl} name={member.name} alt="" />
                <span>{member.name}</span>
                <Badge tone="neutral">
                  {member.role === "OWNER" ? "Responsável" : "Membro"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
      {tab === "settlements" && (
        <Card>
          <div className="section-heading">
            <div>
              <h2>Acerto inteligente</h2>
              <p>Calculado pela regra oficial do servidor.</p>
            </div>
            <Badge tone="neutral">
              {
                group.settlements.filter((item) => item.status !== "PAID")
                  .length
              }{" "}
              transferências
            </Badge>
          </div>
          {group.settlements
            .filter((item) => item.status !== "PAID")
            .map((item) => (
              <div className="bill-row" key={item.id}>
                <div className="avatar">
                  {initials(
                    group.members.find(
                      (member) => member.userId === item.fromUserId,
                    )?.name ?? "?",
                  )}
                </div>
                <div className="bill-info">
                  <strong>
                    {
                      group.members.find(
                        (member) => member.userId === item.fromUserId,
                      )?.name
                    }{" "}
                    paga para{" "}
                    {
                      group.members.find(
                        (member) => member.userId === item.toUserId,
                      )?.name
                    }
                  </strong>
                  <small>Sugestão do cofrin</small>
                </div>
                <MoneyValue amount={item.amount} hidden={hidden} />
                <Button
                  variant="secondary"
                  loading={pending.mutation}
                  onClick={() => void markSettlementPaid(group.id, item.id)}
                >
                  Marcar pago
                </Button>
              </div>
            ))}
          {group.settlements.filter((item) => item.status !== "PAID").length ===
            0 && (
            <EmptyState
              title="Todos quitados"
              detail="Não há transferências pendentes."
            />
          )}
        </Card>
      )}
      {tab === "conversation" && (
        <Card>
          <div className="section-heading"><div><h2>Conversa do grupo</h2><p>Organizem os próximos passos sem misturar mensagens com lançamentos.</p></div></div>
          <GroupConversationPanel groupId={group.id} />
        </Card>
      )}
      <Drawer open={mode !== null} onClose={() => setMode(null)}>
        <DrawerHeader
          eyebrow={
            mode === "contribution"
              ? "Transferência para o grupo"
              : "Despesa compartilhada"
          }
          title={
            mode === "contribution"
              ? "Contribuir para o grupo"
              : "Registrar despesa"
          }
          description={
            mode === "contribution"
              ? "Escolha uma conta de origem. O dinheiro será transferido para o fundo do grupo."
              : "Defina a despesa, quem pagou e como cada pessoa participa."
          }
        />
        {mode === "contribution" ? (
          <>
            <div className="live-summary">
              <h4>Contexto do grupo</h4>
              <div className="impact-grid">
                <div>
                  <span>Fundo atual</span>
                  {formatCurrency(fund, hidden)}
                </div>
                <div>
                  <span>Meta</span>
                  {group.targetAmount
                    ? formatCurrency(group.targetAmount, hidden)
                    : "Sem meta"}
                </div>
                <div>
                  <span>Seu total</span>
                  {formatCurrency(contributionByMe, hidden)}
                </div>
              </div>
            </div>
            <FormSection title="De onde vem o dinheiro?">
              {accounts.map((account) => <button key={account.id} className={`transfer-account ${contributionAccountId === account.id ? "selected" : ""}`} onClick={() => { setContributionAccountId(account.id); setContributionError(""); }}><span><strong>{account.name}</strong><small>Disponível: {formatCurrency(account.balance, hidden)}</small></span><Check size={16} /></button>)}
            </FormSection>
            {contributionAccount && <FormSection title="Valor da contribuição">
              <div className="form-field">
                <label>Quanto deseja transferir?</label>
                <CurrencyInput
                  value={amount}
                  placeholder="350"
                  onChange={(value) => { setAmount(value); setContributionError(""); }}
                />
              </div>
              {operationAmount > contributionAccount.balance && <p className="form-error">Saldo insuficiente nesta conta.</p>}
            </FormSection>}
            {contributionAccount && operationAmount > 0 && !contributionInvalid && <div className="live-summary">
              <h4>Depois desta contribuição</h4>
              <div className="impact-grid">
                <div>
                  <span>{contributionAccount.name}</span>
                  {formatCurrency(contributionAccount.balance, hidden)} → {formatCurrency(contributionAccount.balance - operationAmount, hidden)}
                </div>
                <div>
                  <span>Fundo do grupo</span>
                  {formatCurrency(fund, hidden)} → {formatCurrency(contributionAfter, hidden)}
                </div>
                <div>
                  <span>Sua contribuição total</span>
                  {formatCurrency(contributionByMe, hidden)} → {formatCurrency(contributionByMe + operationAmount, hidden)}
                </div>
                {group.targetAmount && <div><span>Progresso</span>{percent(fund, group.targetAmount)}% → {percent(contributionAfter, group.targetAmount)}%</div>}
              </div>
            </div>}
            {contributionError && <p className="form-error">{contributionError}</p>}
          </>
        ) : (
          <>
            <FormSection title="Despesa">
              <div className="form-field">
                <label>Descrição</label>
                <input
                  value={description}
                  placeholder="Ex.: Reserva de hotel"
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="form-grid">
                <div className="form-field">
                  <label>Valor</label>
                  <CurrencyInput
                    value={amount}
                    placeholder="1.200"
                    onChange={setAmount}
                  />
                </div>
                <div className="form-field">
                  <label>Data</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(event) => setExpenseDate(event.target.value)}
                  />
                </div>
              </div>
              <div className="form-field">
                <label>Categoria</label>
                <select
                  value={expenseCategory}
                  onChange={(event) => setExpenseCategory(event.target.value)}
                >
                  {[
                    "other",
                    "food",
                    "housing",
                    "transport",
                    "leisure",
                    "education",
                  ].map((id) => (
                    <option key={id} value={id}>
                      {categoryName(id)}
                    </option>
                  ))}
                </select>
              </div>
            </FormSection>
            <FormSection title="Pagamento">
              <div className="form-field">
                <label>Origem do pagamento</label>
                <SegmentedControl
                  value={paymentSource}
                  onChange={(value) => {
                    setPaymentSource(value);
                    setExpenseError("");
                  }}
                  options={[
                    {
                      value: "GROUP_FUND",
                      label: "Fundo do grupo",
                      tone: "green",
                    },
                    { value: "MEMBER", label: "Um participante", tone: "gold" },
                  ]}
                />
              </div>
              {paymentSource === "GROUP_FUND" ? (
                <div className="live-summary">
                  <strong>Fundo compartilhado</strong>
                  <p>O valor será retirado somente do saldo coletivo. Nenhuma conta pessoal será alterada.</p>
                  <small>Disponível: {formatCurrency(fund, hidden)}</small>
                  {operationAmount > fund && <p className="form-error">Saldo insuficiente no fundo do grupo.</p>}
                </div>
              ) : (
                <>
                  <div className="form-field">
                    <label>Quem pagou?</label>
                    <div className="choice-grid">
                      {activeMembers.map((member) => (
                        <ChoiceCard
                          key={member.id}
                          title={member.name}
                          selected={currentPayer === member.userId}
                          onClick={() => {
                            setPaidByUserId(member.userId);
                            setExpenseError("");
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  {currentUserPays ? (
                    <div className="form-field">
                      <label>Conta usada no pagamento</label>
                      <div className="choice-list" role="radiogroup" aria-label="Conta usada no pagamento">
                        {accounts.map((account) => (
                          <button
                            type="button"
                            role="radio"
                            aria-checked={expenseAccountId === account.id}
                            key={account.id}
                            className={`transfer-account ${expenseAccountId === account.id ? "selected" : ""}`}
                            onClick={() => {
                              setExpenseAccountId(account.id);
                              setExpenseError("");
                            }}
                          >
                            <span><strong>{account.name}</strong><small>Disponível: {formatCurrency(account.balance, hidden)}</small></span>
                            <Check size={16} />
                          </button>
                        ))}
                      </div>
                      {expenseAccount && operationAmount > expenseAccount.balance && <p className="form-error">Saldo insuficiente nesta conta.</p>}
                    </div>
                  ) : (
                    <FormHint>Esta é apenas uma declaração compartilhada. O Cofrin não acessará nem alterará a conta privada dessa pessoa.</FormHint>
                  )}
                </>
              )}
            </FormSection>
            <FormSection title="Divisão">
              <div className="choice-grid compact">
                {(
                  [
                    {
                      value: "EQUAL",
                      label: "Igual",
                      description: "Mesma parte",
                    },
                    {
                      value: "PERCENTAGE",
                      label: "Percentual",
                      description: "Por porcentagem",
                    },
                    {
                      value: "SHARES",
                      label: "Cotas",
                      description: "Por unidades",
                    },
                    {
                      value: "MANUAL",
                      label: "Manual",
                      description: "Valor por pessoa",
                    },
                  ] as const
                ).map((choice) => (
                  <ChoiceCard
                    key={choice.value}
                    title={choice.label}
                    description={choice.description}
                    selected={splitType === choice.value}
                    onClick={() => setSplitType(choice.value)}
                  />
                ))}
              </div>
              {splitType === "EQUAL" && (
                <div className="live-summary">
                  <strong>
                    {formatCurrency(
                      operationAmount / Math.max(1, activeMembers.length),
                      hidden,
                    )}{" "}
                    por pessoa
                  </strong>
                  <p>{activeMembers.length} participantes na divisão igual.</p>
                </div>
              )}
              {splitType === "PERCENTAGE" &&
                activeMembers.map((member, index) => (
                  <div className="form-field" key={member.id}>
                    <label>{member.name}</label>
                    <input
                      inputMode="decimal"
                      value={
                        percentages[member.userId] ??
                        String(
                          index === activeMembers.length - 1
                            ? 100 -
                                Math.floor(100 / activeMembers.length) * index
                            : Math.floor(100 / activeMembers.length),
                        )
                      }
                      onChange={(event) =>
                        setPercentages({
                          ...percentages,
                          [member.userId]: event.target.value,
                        })
                      }
                    />
                  </div>
                ))}
              {splitType === "PERCENTAGE" && (
                <FormHint>
                  {percentageTotal === 100
                    ? "100% ✓"
                    : `Faltam ${100 - percentageTotal}% para completar a divisão.`}
                </FormHint>
              )}
              {splitType === "SHARES" &&
                activeMembers.map((member) => (
                  <div className="form-field" key={member.id}>
                    <label>
                      {member.name} —{" "}
                      {formatCurrency(
                        (operationAmount *
                          Math.max(1, shares[member.userId] ?? 1)) /
                          Math.max(1, totalShares),
                        hidden,
                      )}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={shares[member.userId] ?? 1}
                      onChange={(event) =>
                        setShares({
                          ...shares,
                          [member.userId]: Math.max(
                            1,
                            Number(event.target.value),
                          ),
                        })
                      }
                    />
                  </div>
                ))}
              {splitType === "MANUAL" &&
                activeMembers.map((member) => (
                  <div className="form-field" key={member.id}>
                    <label>{member.name}</label>
                    <CurrencyInput
                      value={manualAmounts[member.userId] ?? ""}
                      placeholder="0,00"
                      onChange={(value) =>
                        setManualAmounts({
                          ...manualAmounts,
                          [member.userId]: value,
                        })
                      }
                    />
                  </div>
                ))}
              {splitType === "MANUAL" && (
                <FormHint>
                  Distribuído {formatCurrency(manualTotal, hidden)} /{" "}
                  {formatCurrency(operationAmount, hidden)} ·{" "}
                  {manualTotal === operationAmount
                    ? "valor completo ✓"
                    : `faltam ${formatCurrency(Math.max(0, operationAmount - manualTotal), hidden)}`}
                </FormHint>
              )}
            </FormSection>
            <div className="live-summary">
              <h4>Resumo antes de salvar</h4>
              <strong>{description || "Nova despesa"}</strong>
              <div className="impact-grid">
                <div>
                  <span>Valor</span>
                  {formatCurrency(operationAmount, hidden)}
                </div>
                <div>
                  <span>Pago por</span>
                  {paymentSource === "GROUP_FUND" ? "Fundo do grupo" : activeMembers.find(
                    (member) => member.userId === currentPayer,
                  )?.name ?? "Participante"}
                </div>
                <div>
                  <span>Divisão</span>
                  {splitType === "EQUAL"
                    ? `Igual entre ${activeMembers.length}`
                    : splitType}
                </div>
              </div>
            </div>
            {expenseError && <p className="form-error">{expenseError}</p>}
          </>
        )}
        <Button
          loading={pending.mutation}
          disabled={mode === "contribution" ? contributionInvalid : expenseInvalid}
          onClick={async () => {
            if (operationAmount <= 0) return;
            if (mode === "contribution") {
              if (!contributionAccount) return;
              try {
                await addGroupContribution(group.id, contributionAccount.id, operationAmount);
              } catch {
                setContributionError("Não foi possível registrar a contribuição. Nenhum valor foi movimentado.");
                return;
              }
            } else {
              try {
                await addGroupExpense(group.id, {
                  description,
                  amount: operationAmount,
                  paidByUserId: paymentSource === "GROUP_FUND" ? (profile?.id ?? currentPayer) : currentPayer,
                  date: expenseDate,
                  category: expenseCategory,
                  splitType,
                  paymentSource,
                  sourceAccountId: currentUserPays ? expenseAccountId : undefined,
                  participants: activeMembers.map((member, index) => ({
                    userId: member.userId,
                    percentage:
                      splitType === "PERCENTAGE"
                        ? Number(
                            percentages[member.userId] ??
                              (index === activeMembers.length - 1
                                ? 100 - Math.floor(100 / activeMembers.length) * index
                                : Math.floor(100 / activeMembers.length)),
                          )
                        : undefined,
                    shares: splitType === "SHARES" ? Math.max(1, shares[member.userId] ?? 1) : undefined,
                    amount: splitType === "MANUAL" ? Number(manualAmounts[member.userId] ?? 0) : undefined,
                  })),
                });
              } catch (cause) {
                setExpenseError(cause instanceof Error ? cause.message : "Não foi possível registrar a despesa. Nenhum valor foi movimentado.");
                return;
              }
            }
            setAmount("");
            setDescription("");
            setContributionAccountId("");
            setExpenseAccountId("");
            setExpenseError("");
            setMode(null);
          }}
        >
          {mode === "contribution"
            ? `Contribuir ${operationAmount > 0 ? formatCurrency(operationAmount) : ""}`
            : "Salvar despesa"}
        </Button>
      </Drawer>
    </>
  );
}
