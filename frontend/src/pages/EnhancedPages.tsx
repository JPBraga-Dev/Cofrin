import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays,
  Car,
  Check,
  CreditCard,
  Download,
  Gift,
  GraduationCap,
  Heart,
  House,
  Plane,
  Plus,
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
} from "../components/ui";
import { useAppData } from "../providers/AppDataProvider";
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
  categoryName,
  groupLabel,
  initials,
  piggyTotal,
  spendingByCategory,
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

export function EnhancedTransactions() {
  const {
    transactions,
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
                    <td>{categoryName(item.categoryId)}</td>
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
                      <Button
                        variant="ghost"
                        aria-expanded={actionId === item.id}
                        onClick={() =>
                          setActionId(actionId === item.id ? null : item.id)
                        }
                      >
                        •••
                      </Button>
                      {actionId === item.id && (
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
  const { cards } = useAppData();
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
    { id: "main", label: "Conta principal" },
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
              { value: "TRANSFER", label: "Transferência", tone: "gold" },
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
                draft.type === "TRANSFER"
                  ? "Ex.: Reserva para viagem"
                  : "Ex.: Notebook"
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
                : draft.type === "TRANSFER"
                  ? "Conta de origem"
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
  const { piggies, hidden, createPiggy, movePiggy, pending } = useAppData();
  const [create, setCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const selected = piggies.find((item) => item.id === selectedId) ?? null;
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    targetAmount: "",
    monthlyContribution: "",
    deadline: "",
    icon: "Target",
  });
  const [amount, setAmount] = useState("");
  const [movementType, setMovementType] = useState<"DEPOSIT" | "WITHDRAWAL">(
    "DEPOSIT",
  );
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
                {percent(item.currentAmount, item.targetAmount)}% concluído
              </span>
              <span>
                {item.deadline
                  ? `até ${formatShortDate(item.deadline)}`
                  : "Sem prazo"}
              </span>
            </div>
            <div className="piggy-actions">
              <Button
                variant="primary"
                disabled={!item.monthlyContribution}
                onClick={() =>
                  void movePiggy(
                    item.id,
                    item.monthlyContribution ?? 0,
                    "DEPOSIT",
                  )
                }
              >
                Aportar
              </Button>
              <Button variant="secondary" onClick={() => setSelectedId(item.id)}>
                Gerenciar
              </Button>
            </div>
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
          description="Você poderá fazer aportes e retiradas quando quiser."
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
          description="Sem juros: a previsão considera apenas o aporte planejado."
        >
          <div className="form-field">
            <label>Aporte mensal</label>
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
              : "Estimativa: defina meta e aporte mensal para calcular o prazo."}
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
      <Drawer open={Boolean(selected)} onClose={() => setSelectedId(null)}>
        {selected && (
          <>
            <DrawerHeader
              eyebrow="Operação no porquinho"
              title={selected.name}
              description="Veja o impacto da operação antes de confirmar."
            />
            <Card>
              <div className="piggy-amounts">
                <MoneyValue amount={selected.currentAmount} hidden={hidden} />
                <span>de {formatCurrency(selected.targetAmount, hidden)}</span>
              </div>
              <Progress
                value={percent(selected.currentAmount, selected.targetAmount)}
                color="#4ade80"
              />
            </Card>
            <FormSection title="Movimentação">
              <SegmentedControl
                value={movementType}
                onChange={setMovementType}
                options={[
                  {
                    value: "DEPOSIT",
                    label: "Adicionar dinheiro",
                    tone: "green",
                  },
                  {
                    value: "WITHDRAWAL",
                    label: "Retirar dinheiro",
                    tone: "red",
                  },
                ]}
              />
              <div className="form-field">
                <label>Valor</label>
                <CurrencyInput
                  value={amount}
                  placeholder="0,00"
                  onChange={setAmount}
                />
              </div>
            </FormSection>
            <div className="live-summary">
              <h4>Impacto da operação</h4>
              <div className="impact-grid">
                <div>
                  <span>Antes</span>
                  {formatCurrency(selected.currentAmount, hidden)}
                </div>
                <div>
                  <span>Depois</span>
                  {formatCurrency(
                    Math.max(
                      0,
                      selected.currentAmount +
                        (movementType === "DEPOSIT"
                          ? Number(amount || 0)
                          : -Number(amount || 0)),
                    ),
                    hidden,
                  )}
                </div>
                <div>
                  <span>Progresso</span>
                  {percent(selected.currentAmount, selected.targetAmount)}% →{" "}
                  {percent(
                    Math.max(
                      0,
                      selected.currentAmount +
                        (movementType === "DEPOSIT"
                          ? Number(amount || 0)
                          : -Number(amount || 0)),
                    ),
                    selected.targetAmount,
                  )}
                  %
                </div>
              </div>
            </div>
            <Button
              variant={movementType === "DEPOSIT" ? "primary" : "secondary"}
              loading={pending.mutation}
              onClick={async () => {
                if (Number(amount) > 0) {
                  await movePiggy(selected.id, Number(amount), movementType);
                  setAmount("");
                }
              }}
            >
              {movementType === "DEPOSIT"
                ? "Registrar aporte"
                : "Registrar retirada"}
            </Button>
            <h3 className="drawer-subtitle">Histórico</h3>
            {selected.movements.map((movement) => (
              <div className="bill-row" key={movement.id}>
                <span>{movement.type === "DEPOSIT" ? "↗" : "↘"}</span>
                <div className="bill-info">
                  <strong>{movement.description ?? "Movimentação"}</strong>
                  <small>{formatDate(movement.date)}</small>
                </div>
                <MoneyValue
                  amount={movement.amount}
                  type={movement.type === "DEPOSIT" ? "income" : "expense"}
                  hidden={hidden}
                  size="small"
                />
              </div>
            ))}
          </>
        )}
      </Drawer>
    </>
  );
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
                    <button className="avatar" key={member.id} onClick={(event) => { event.stopPropagation(); const person = [...friends, profile].find((item) => item?.id === member.userId); if (person) navigate(`/u/${person.username}`); }}>
                      {initials(member.name)}
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
  const fund =
    group.contributions
      .filter((item) => item.status === "CONFIRMED")
      .reduce((total, item) => total + item.amount, 0) -
    group.expenses
      .filter((item) => item.paymentSource === "GROUP_FUND")
      .reduce((total, item) => total + item.amount, 0);
  const activeMembers = group.members.filter(
    (member) => member.status === "ACTIVE",
  );
  const currentPayer = paidByUserId || activeMembers[0]?.userId || "";
  const contributionByMe = group.contributions
    .filter((item) => item.userId === "u-joao" && item.status === "CONFIRMED")
    .reduce((total, item) => total + item.amount, 0);
  const operationAmount = Number(amount || 0);
  const contributionAfter = fund + operationAmount;
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
                <div className="avatar">{initials(member.name)}</div>
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
              <p>Aportes confirmados dos participantes.</p>
            </div>
            <Button onClick={() => setMode("contribution")}>
              Adicionar aporte
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
                <small>{formatDate(item.date)}</small>
              </div>
              <MoneyValue amount={item.amount} type="income" hidden={hidden} />
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
                <div className="avatar">{initials(member.name)}</div>
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
              ? "Aporte no grupo"
              : "Despesa compartilhada"
          }
          title={
            mode === "contribution"
              ? "Registrar contribuição"
              : "Registrar despesa"
          }
          description={
            mode === "contribution"
              ? "Veja como seu aporte altera o fundo coletivo."
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
            <FormSection title="Valor da contribuição">
              <div className="form-field">
                <label>Quanto você quer adicionar?</label>
                <CurrencyInput
                  value={amount}
                  placeholder="350"
                  onChange={setAmount}
                />
              </div>
            </FormSection>
            <div className="live-summary">
              <h4>Preview da contribuição</h4>
              <div className="impact-grid">
                <div>
                  <span>Você está adicionando</span>
                  {formatCurrency(operationAmount, hidden)}
                </div>
                <div>
                  <span>Fundo</span>
                  {formatCurrency(fund, hidden)} →{" "}
                  {formatCurrency(contributionAfter, hidden)}
                </div>
                <div>
                  <span>Progresso</span>
                  {group.targetAmount
                    ? `${percent(fund, group.targetAmount)}% → ${percent(contributionAfter, group.targetAmount)}%`
                    : "Sem meta"}
                </div>
              </div>
            </div>
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
                  onChange={setPaymentSource}
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
              <div className="form-field">
                <label>Quem pagou?</label>
                <div className="choice-grid">
                  {activeMembers.map((member) => (
                    <ChoiceCard
                      key={member.id}
                      title={member.name}
                      selected={currentPayer === member.userId}
                      onClick={() => setPaidByUserId(member.userId)}
                    />
                  ))}
                </div>
              </div>
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
                  {activeMembers.find(
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
          </>
        )}
        <Button
          loading={pending.mutation}
          onClick={async () => {
            if (operationAmount <= 0) return;
            if (mode === "contribution")
              await addGroupContribution(group.id, operationAmount);
            else if (
              description.trim() &&
              (splitType !== "PERCENTAGE" || percentageTotal === 100) &&
              (splitType !== "MANUAL" || manualTotal === operationAmount)
            )
              await addGroupExpense(group.id, {
                description,
                amount: operationAmount,
                paidByUserId: currentPayer,
                date: expenseDate,
                category: expenseCategory,
                splitType,
                paymentSource,
                participants: activeMembers.map((member, index) => ({
                  userId: member.userId,
                  percentage:
                    splitType === "PERCENTAGE"
                      ? Number(
                          percentages[member.userId] ??
                            (index === activeMembers.length - 1
                              ? 100 -
                                Math.floor(100 / activeMembers.length) * index
                              : Math.floor(100 / activeMembers.length)),
                        )
                      : undefined,
                  shares:
                    splitType === "SHARES"
                      ? Math.max(1, shares[member.userId] ?? 1)
                      : undefined,
                  amount:
                    splitType === "MANUAL"
                      ? Number(manualAmounts[member.userId] ?? 0)
                      : undefined,
                })),
              });
            setAmount("");
            setDescription("");
            setMode(null);
          }}
        >
          {mode === "contribution"
            ? "Confirmar contribuição"
            : "Salvar despesa"}
        </Button>
      </Drawer>
    </>
  );
}

export function EnhancedCards() {
  const { cards, transactions, hidden, createCard, pending } = useAppData();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    brand: "Mastercard",
    lastFourDigits: "",
    limit: "",
    closingDay: "4",
    dueDay: "11",
    color: "carbon",
  });
  const selected = cards.find((card) => card.id === selectedId) ?? cards[0];
  const reset = () => {
    setDraft({
      name: "",
      brand: "Mastercard",
      lastFourDigits: "",
      limit: "",
      closingDay: "4",
      dueDay: "11",
      color: "carbon",
    });
    setOpen(false);
  };
  const addCard = async () => {
    if (
      !draft.name.trim() ||
      !/^\d{4}$/.test(draft.lastFourDigits) ||
      Number(draft.limit) <= 0
    )
      return;
    const item = await createCard({
      name: draft.name.trim(),
      brand: draft.brand,
      lastFourDigits: draft.lastFourDigits,
      limit: Number(draft.limit),
      closingDay: Number(draft.closingDay),
      dueDay: Number(draft.dueDay),
      color: draft.color,
    });
    setSelectedId(item.id);
    setHighlightId(item.id);
    reset();
    window.setTimeout(() => setHighlightId(null), 1000);
  };
  const invoiceFor = (cardId: string) =>
    transactions
      .filter((item) => item.type === "EXPENSE" && item.accountId === cardId)
      .reduce((total, item) => total + item.amount, 0);
  return (
    <>
      <PageHeader
        title="Meus cartões"
        description="Acompanhe limite, fechamento, fatura e parcelas."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} />
            Adicionar cartão
          </Button>
        }
      />
      {cards.length ? (
        <div className="piggy-grid">
          {cards.map((card) => {
            const invoice = invoiceFor(card.id);
            return (
              <Card
                className={`balance-card interactive-card ${selected?.id === card.id ? "selected-card" : ""} ${highlightId === card.id ? "item-highlight" : ""}`}
                key={card.id}
              >
                <button
                  className={`credit-preview ${cardColorClass(card.color)}`}
                  onClick={() => setSelectedId(card.id)}
                  aria-pressed={selected?.id === card.id}
                >
                  <span className="preview-brand">
                    {card.brand.toUpperCase()}
                  </span>
                  <strong>{card.name}</strong>
                  <span className="preview-number">
                    •••• {card.lastFourDigits}
                  </span>
                  <span className="preview-meta">
                    <span>
                      Fecha {String(card.closingDay).padStart(2, "0")}
                    </span>
                    <span>Vence {String(card.dueDay).padStart(2, "0")}</span>
                  </span>
                </button>
                <div className="piggy-amounts">
                  <span>Limite disponível</span>
                  <MoneyValue
                    amount={Math.max(0, card.limit - invoice)}
                    hidden={hidden}
                  />
                </div>
                <Progress
                  value={percent(invoice, card.limit)}
                  color="#f5c451"
                />
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Nenhum cartão cadastrado"
          detail="Adicione seus cartões para acompanhar limite, faturas e compras parceladas."
        />
      )}
      <Card className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Compras nas faturas</h2>
            <p>As compras vêm dos lançamentos vinculados ao cartão.</p>
          </div>
        </div>
        {selected ? (
          <>
            <div className="summary-strip">
              <div>
                <span>Fatura atual</span>
                <MoneyValue amount={invoiceFor(selected.id)} hidden={hidden} />
              </div>
              <div>
                <span>Limite</span>
                <MoneyValue amount={selected.limit} hidden={hidden} />
              </div>
              <div>
                <span>Próximo vencimento</span>
                <strong>Dia {selected.dueDay}</strong>
              </div>
            </div>
            {transactions
              .filter(
                (item) =>
                  item.type === "EXPENSE" && item.accountId === selected.id,
              )
              .map((item) => (
                <div className="bill-row" key={item.id}>
                  <span className="bill-date">
                    {formatShortDate(item.date)}
                  </span>
                  <div className="bill-info">
                    <strong>{item.description}</strong>
                    <small>{categoryName(item.categoryId)}</small>
                  </div>
                  <MoneyValue
                    amount={item.amount}
                    type="expense"
                    hidden={hidden}
                  />
                </div>
              ))}
            {!transactions.some(
              (item) =>
                item.type === "EXPENSE" && item.accountId === selected.id,
            ) && (
              <EmptyState
                title="Nenhuma compra nesta fatura"
                detail="Os lançamentos no cartão aparecerão aqui automaticamente."
              />
            )}
          </>
        ) : null}
      </Card>
      <Drawer open={open} onClose={() => setOpen(false)}>
        <DrawerHeader
          eyebrow="Cartões"
          title="Adicionar cartão"
          description="Configure como este cartão aparecerá no Cofrin. Nenhum dado sensível é solicitado."
        />
        <div className="drawer-preview">
          <div className={`credit-preview ${draft.color}`}>
            <span className="preview-brand">{draft.brand.toUpperCase()}</span>
            <strong>{draft.name || "Cartão principal"}</strong>
            <span className="preview-number">
              •••• {draft.lastFourDigits || "••••"}
            </span>
            <span className="preview-meta">
              <span>Fecha {draft.closingDay.padStart(2, "0")}</span>
              <span>Vence {draft.dueDay.padStart(2, "0")}</span>
            </span>
          </div>
        </div>
        <FormSection
          title="Identificação"
          description="Informações para reconhecer o cartão na sua organização."
        >
          <div className="form-field">
            <label>Nome do cartão</label>
            <input
              autoFocus
              value={draft.name}
              placeholder="Ex.: Cartão principal"
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
            <FormHint>Use um nome fácil de reconhecer.</FormHint>
          </div>
          <div className="form-field">
            <label>Bandeira</label>
            <div className="choice-grid compact">
              {["Mastercard", "Visa", "Elo", "Amex", "Outra"].map((brand) => (
                <ChoiceCard
                  key={brand}
                  title={brand}
                  selected={draft.brand === brand}
                  onClick={() => setDraft({ ...draft, brand })}
                />
              ))}
            </div>
          </div>
          <div className="form-field">
            <label>Últimos 4 dígitos</label>
            <input
              inputMode="numeric"
              maxLength={4}
              value={draft.lastFourDigits}
              placeholder="4582"
              onChange={(event) =>
                setDraft({
                  ...draft,
                  lastFourDigits: event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 4),
                })
              }
            />
            <FormHint>
              Mostramos apenas estes quatro dígitos no Cofrin.
            </FormHint>
          </div>
        </FormSection>
        <FormSection
          title="Organização da fatura"
          description="Acompanhe quando a fatura fecha e vence."
        >
          <div className="form-field">
            <label>Limite</label>
            <CurrencyInput
              value={draft.limit}
              placeholder="5.000"
              onChange={(limit) => setDraft({ ...draft, limit })}
            />
            <FormHint>
              Usado para acompanhar quanto do limite está comprometido.
            </FormHint>
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label>Dia de fechamento</label>
              <select
                value={draft.closingDay}
                onChange={(event) =>
                  setDraft({ ...draft, closingDay: event.target.value })
                }
              >
                {Array.from({ length: 31 }, (_, index) => index + 1).map(
                  (day) => (
                    <option key={day}>{day}</option>
                  ),
                )}
              </select>
            </div>
            <div className="form-field">
              <label>Dia de vencimento</label>
              <select
                value={draft.dueDay}
                onChange={(event) =>
                  setDraft({ ...draft, dueDay: event.target.value })
                }
              >
                {Array.from({ length: 31 }, (_, index) => index + 1).map(
                  (day) => (
                    <option key={day}>{day}</option>
                  ),
                )}
              </select>
            </div>
          </div>
        </FormSection>
        <FormSection
          title="Aparência"
          description="Escolha uma cor discreta para identificar o cartão."
        >
          <div className="choice-grid compact">
            {["carbon", "graphite", "green", "gold", "wine"].map(
              (color) => (
                <ChoiceCard
                  key={color}
                  title={
                    {
                      carbon: "Carbon",
                      graphite: "Grafite",
                      green: "Verde",
                      gold: "Dourado",
                      wine: "Vinho",
                    }[color] ?? color
                  }
                  selected={draft.color === color}
                  onClick={() => setDraft({ ...draft, color })}
                />
              ),
            )}
          </div>
        </FormSection>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void addCard();
          }}
        >
          <DrawerFooter
            onCancel={reset}
            submitLabel="Adicionar cartão"
            loading={pending.mutation}
          />
        </form>
      </Drawer>
    </>
  );
}

export function EnhancedBudgets() {
  const { budgets, transactions, hidden, createBudget, pending } = useAppData();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("food");
  const [limit, setLimit] = useState("");
  const [referenceMonth, setReferenceMonth] = useState(
    [...transactions].sort((a, b) => b.date.localeCompare(a.date))[0]?.date.slice(0, 7) ?? today().slice(0, 7),
  );
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const currentSpent = transactions
    .filter((item) => item.type === "EXPENSE" && item.categoryId === category && item.date.startsWith(referenceMonth))
    .reduce((total, item) => total + item.amount, 0);
  return (
    <>
      <PageHeader
        title="Orçamentos"
        description="Crie limites e acompanhe seus gastos reais."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} />
            Novo orçamento
          </Button>
        }
      />
      <div className="budget-grid">
        {budgets.map((item) => {
          const spent = budgetSpent(item, transactions);
          const status = budgetStatus(spent, item.limitAmount);
          const tone =
            status === "ultrapassado"
              ? "red"
              : status === "em alerta"
                ? "gold"
                : "green";
          return (
            <button
              type="button"
              onClick={() => navigate(`/budgets/${item.id}`)}
              className={`budget-card ${highlightId === item.id ? "item-highlight" : ""}`}
              key={item.id}
            >
              <div className="budget-card-heading"><h2>{categoryName(item.categoryId)}</h2><Badge tone={tone}>{status}</Badge></div>
              <div className="budget-values">
                <MoneyValue amount={spent} hidden={hidden} />
                <span>de {formatCurrency(item.limitAmount, hidden)}</span>
              </div>
              <Progress
                value={percent(spent, item.limitAmount)}
                color={
                  tone === "red"
                    ? "#ef4444"
                    : tone === "gold"
                      ? "#f5c451"
                      : "#4ade80"
                }
              />
              <small>
                {formatCurrency(
                  Math.abs(item.limitAmount - spent),
                  hidden,
                )}{" "}
                {spent > item.limitAmount
                  ? "acima do limite"
                  : "restante"}
              </small>
              <span className="budget-used">{percent(spent, item.limitAmount)}% utilizado</span>
            </button>
          );
        })}
      </div>
      <Drawer open={open} onClose={() => setOpen(false)}>
        <DrawerHeader
          eyebrow="Planejamento mensal"
          title="Novo orçamento"
          description="Defina um limite com base no gasto que já existe nos seus lançamentos."
        />
        <FormSection
          title="Categoria"
          description="Escolha onde quer acompanhar seus gastos."
        >
          <div className="choice-grid compact">
            {[
              "food",
              "housing",
              "transport",
              "health",
              "subscriptions",
              "leisure",
              "education",
            ].map((id) => (
              <ChoiceCard
                key={id}
                title={categoryName(id)}
                selected={category === id}
                onClick={() => setCategory(id)}
              />
            ))}
          </div>
        </FormSection>
        <div className="live-summary">
          <h4>Contexto atual</h4>
          <div className="impact-grid">
            <div>
              <span>Você gastou</span>
              {formatCurrency(currentSpent, hidden)}
            </div>
            <div>
              <span>Categoria</span>
              {categoryName(category)}
            </div>
          </div>
        </div>
        <FormSection title="Limite">
          <div className="form-field">
            <label>Limite mensal</label>
            <CurrencyInput
              value={limit}
              placeholder="1.000"
              onChange={setLimit}
            />
          </div>
          <div className="form-field">
            <label>Mês de referência</label>
            <input type="month" value={referenceMonth} onChange={(event) => setReferenceMonth(event.target.value)} />
            <FormHint>Somente despesas deste mês entram neste orçamento.</FormHint>
          </div>
        </FormSection>
        <div className="live-summary">
          <h4>Impacto do novo limite</h4>
          <div className="impact-grid">
            <div>
              <span>Gasto atual</span>
              {formatCurrency(currentSpent, hidden)}
            </div>
            <div>
              <span>Novo limite</span>
              {formatCurrency(Number(limit || 0), hidden)}
            </div>
            <div>
              <span>Restariam</span>
              {formatCurrency(
                Math.max(0, Number(limit || 0) - currentSpent),
                hidden,
              )}
            </div>
          </div>
          {Number(limit) > 0 && (
            <p>{percent(currentSpent, Number(limit))}% já utilizado.</p>
          )}
        </div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (Number(limit) <= 0) return;
            const item = await createBudget({
              categoryId: category,
              limitAmount: Number(limit),
              referenceMonth,
            });
            setHighlightId(item.id);
            setOpen(false);
            window.setTimeout(() => setHighlightId(null), 1000);
          }}
        >
          <DrawerFooter
            onCancel={() => setOpen(false)}
            submitLabel="Salvar orçamento"
            loading={pending.mutation}
          />
        </form>
      </Drawer>
    </>
  );
}

export function EnhancedBudgetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { budgets, transactions, hidden, updateBudget, deleteBudget, pending } = useAppData();
  const budget = budgets.find((item) => item.id === id);
  const [editing, setEditing] = useState(false);
  const [category, setCategory] = useState(budget?.categoryId ?? "food");
  const [limit, setLimit] = useState(String(budget?.limitAmount ?? ""));
  const [referenceMonth, setReferenceMonth] = useState(budget?.referenceMonth ?? today().slice(0, 7));
  if (!budget) return <EmptyState title="Orçamento não encontrado" detail="Volte para a lista e escolha um orçamento existente." />;
  const expenses = transactions.filter((item) => item.type === "EXPENSE" && item.categoryId === budget.categoryId && (!budget.referenceMonth || item.date.startsWith(budget.referenceMonth))).sort((a, b) => b.date.localeCompare(a.date));
  const spent = expenses.reduce((total, item) => total + item.amount, 0);
  const available = budget.limitAmount - spent;
  const usage = percent(spent, budget.limitAmount);
  const isExceeded = available < 0;
  const status = budgetStatus(spent, budget.limitAmount);
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${budget.referenceMonth ?? referenceMonth}-01T12:00:00`));
  const largest = expenses.reduce((largestValue, item) => Math.max(largestValue, item.amount), 0);
  return <div className="budget-detail">
    <button className="back-link" onClick={() => navigate("/budgets")}>← Orçamentos</button>
    <div className="detail-hero"><div><p className="eyebrow">Planejamento mensal</p><h1>{categoryName(budget.categoryId)}</h1><p>{monthName}. Controle seus gastos nesta categoria.</p></div><div className="detail-actions"><Badge tone={isExceeded ? "red" : usage >= 80 ? "gold" : "green"}>{status}</Badge><Button variant="secondary" onClick={() => setEditing(true)}>Editar orçamento</Button></div></div>
    <Card className="budget-hero"><div><span>Limite mensal</span><MoneyValue amount={budget.limitAmount} hidden={hidden} size="large" /></div><div><span>Gasto</span><MoneyValue amount={spent} hidden={hidden} /></div><div><span>{isExceeded ? "Ultrapassado em" : "Disponível"}</span><MoneyValue amount={Math.abs(available)} type={isExceeded ? "expense" : "income"} hidden={hidden} /></div><div><span>Utilizado</span><strong>{usage}%</strong></div><Progress value={usage} color={isExceeded ? "#ef4444" : usage >= 80 ? "#f5c451" : "#4ade80"} /></Card>
    <div className="budget-detail-grid"><Card><div className="section-heading"><div><h2>Gastos deste orçamento</h2><p>Despesas de {categoryName(budget.categoryId)} que formam este total.</p></div><Button onClick={() => navigate(`/transactions?new=1&category=${budget.categoryId}&date=${budget.referenceMonth ?? `${today().slice(0, 7)}-01`}`)}><Plus size={15} />Adicionar gasto</Button></div>{expenses.length ? expenses.map((item) => <button className="budget-expense-row" key={item.id} onClick={() => navigate(`/transactions?q=${encodeURIComponent(item.description)}`)}><div><strong>{item.description}</strong><small>{formatDate(item.date)} · {item.paymentMethod}</small></div><MoneyValue amount={item.amount} type="expense" hidden={hidden} size="small" /></button>) : <EmptyState title="Nenhum gasto neste orçamento ainda" detail={`As despesas de ${categoryName(budget.categoryId)} registradas em ${monthName} aparecerão automaticamente aqui.`} />}</Card><Card className="budget-insights"><h2>Resumo do período</h2><div><span>Quantidade de gastos</span><strong>{expenses.length}</strong></div><div><span>Maior gasto</span><MoneyValue amount={largest} hidden={hidden} size="small" /></div><div><span>Média por gasto</span><MoneyValue amount={expenses.length ? spent / expenses.length : 0} hidden={hidden} size="small" /></div><p>O uso é calculado automaticamente pelos lançamentos. Não é necessário informar gastos manualmente.</p></Card></div>
    <Drawer open={editing} onClose={() => setEditing(false)}><DrawerHeader eyebrow="Planejamento mensal" title="Editar orçamento" description="Alterar a categoria, o limite ou o mês recalcula o resumo automaticamente." /><form onSubmit={async (event) => { event.preventDefault(); if (Number(limit) <= 0) return; await updateBudget(budget.id, { categoryId: category, limitAmount: Number(limit), referenceMonth }); setEditing(false); }}><FormSection title="Configuração"><div className="form-field"><label>Categoria</label><select value={category} onChange={(event) => setCategory(event.target.value)}>{["food", "housing", "transport", "health", "subscriptions", "leisure", "education"].map((value) => <option key={value} value={value}>{categoryName(value)}</option>)}</select></div><div className="form-field"><label>Limite mensal</label><CurrencyInput value={limit} onChange={setLimit} /></div><div className="form-field"><label>Mês de referência</label><input type="month" value={referenceMonth} onChange={(event) => setReferenceMonth(event.target.value)} /></div></FormSection><DrawerFooter onCancel={() => setEditing(false)} submitLabel="Salvar alterações" loading={pending.mutation} /></form><Button className="budget-delete" variant="danger" loading={pending.mutation} onClick={async () => { await deleteBudget(budget.id); navigate("/budgets"); }}>Excluir orçamento</Button></Drawer>
  </div>;
}

export function EnhancedCalendar() {
  const { transactions, groups, hidden } = useAppData();
  const [selected, setSelected] = useState<string | null>(null);
  const reference =
    [...transactions].sort((a, b) => b.date.localeCompare(a.date))[0]?.date ??
    today();
  const [year, month] = reference.split("-").map(Number);
  const first = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const events = [
    ...transactions
      .filter((item) => item.status === "PENDING")
      .map((item) => ({
        date: item.date,
        label: item.description,
        amount: item.amount,
      })),
    ...groups
      .filter((item) => item.eventDate)
      .map((item) => ({ date: item.eventDate!, label: item.name, amount: 0 })),
  ];
  const title = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1));
  return (
    <>
      <PageHeader
        title="Calendário"
        description="Contas, faturas, receitas e eventos conectados aos seus dados."
        action={
          <Button variant="secondary">
            <CalendarDays size={15} />
            {title}
          </Button>
        }
      />
      <Card>
        <div className="calendar-grid">
          {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((item) => (
            <div className="calendar-label" key={item}>
              {item}
            </div>
          ))}
          {Array.from({ length: first }, (_, index) => (
            <div key={`blank-${index}`} />
          ))}
          {Array.from({ length: days }, (_, index) => {
            const day = index + 1;
            const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const items = events.filter((item) => item.date === date);
            return (
              <button
                className={`calendar-day ${date === today() ? "today" : ""}`}
                onClick={() => items.length && setSelected(date)}
                key={date}
              >
                {day}
                {items.map((item) => (
                  <i className="calendar-event" key={item.label}>
                    {item.label}
                  </i>
                ))}
              </button>
            );
          })}
        </div>
      </Card>
      <Drawer open={Boolean(selected)} onClose={() => setSelected(null)}>
        <DrawerHeader
          eyebrow="Agenda financeira"
          title={selected ? formatDate(selected) : "Dia selecionado"}
          description={`${events.filter((item) => item.date === selected).length} compromisso(s) · ${formatCurrency(
            events
              .filter((item) => item.date === selected)
              .reduce((total, item) => total + item.amount, 0),
            hidden,
          )} previsto(s)`}
        />
        {events
          .filter((item) => item.date === selected)
          .map((item) => (
            <div className="bill-row" key={item.label}>
              <span>
                <WalletCards size={15} />
              </span>
              <div className="bill-info">
                <strong>{item.label}</strong>
                <small>Compromisso financeiro</small>
              </div>
              {item.amount > 0 && (
                <MoneyValue amount={item.amount} hidden={hidden} size="small" />
              )}
            </div>
          ))}
      </Drawer>
    </>
  );
}

export function EnhancedReports() {
  const { transactions, hidden } = useAppData();
  const totals = transactionTotals(transactions);
  const categories = spendingByCategory(transactions);
  const chart = Object.entries(
    transactions.reduce<Record<string, { income: number; expense: number }>>(
      (result, item) => {
        const key = item.date.slice(0, 7);
        const current = result[key] ?? { income: 0, expense: 0 };
        return {
          ...result,
          [key]: {
            income: current.income + (item.type === "INCOME" ? item.amount : 0),
            expense:
              current.expense + (item.type === "EXPENSE" ? item.amount : 0),
          },
        };
      },
      {},
    ),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({
      month: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(
        new Date(`${month}-01T12:00:00`),
      ),
      ...value,
    }));
  const download = () => {
    const csv = [
      "Data,Descrição,Tipo,Categoria,Conta,Status,Valor",
      ...transactions.map(
        (item) =>
          `${item.date},${item.description},${item.type},${categoryName(item.categoryId)},${accountName(item.accountId)},${item.status},${item.amount}`,
      ),
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "cofrin-lancamentos.csv";
    link.click();
  };
  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Resumo e evolução das movimentações oficiais."
        action={
          <Button variant="secondary" onClick={download}>
            <Download size={15} />
            Exportar CSV
          </Button>
        }
      />
      <div className="stats">
        <Card>
          <span>Receita total</span>
          <MoneyValue amount={totals.income} type="income" hidden={hidden} />
        </Card>
        <Card>
          <span>Despesa total</span>
          <MoneyValue amount={totals.expense} type="expense" hidden={hidden} />
        </Card>
        <Card>
          <span>Saldo</span>
          <MoneyValue amount={totals.income - totals.expense} hidden={hidden} />
        </Card>
        <Card>
          <span>Taxa de economia</span>
          <strong>
            {totals.income
              ? (
                  ((totals.income - totals.expense) / totals.income) *
                  100
                ).toFixed(1)
              : 0}
            %
          </strong>
        </Card>
      </div>
      <div className="report-grid dashboard-section">
        <Card className="chart-card">
          <div className="section-heading">
            <div>
              <h2>Fluxo e evolução</h2>
              <p>Receitas e despesas por mês.</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="82%">
            <AreaChart data={chart}>
              <XAxis dataKey="month" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value, hidden)}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#4ade80"
                fill="#4ade8022"
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="#f47272"
                fill="#f4727222"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div className="section-heading">
            <div>
              <h2>Categorias</h2>
              <p>Gastos no período.</p>
            </div>
          </div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="amount"
                  innerRadius={50}
                  outerRadius={70}
                >
                  {categories.map((item, index) => (
                    <Cell
                      fill={
                        ["#4ade80", "#f5c451", "#e87878", "#71717a", "#4a4a50"][
                          index % 5
                        ]
                      }
                      key={item.categoryId}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value, hidden)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {categories.map((item) => (
            <div className="category-row" key={item.categoryId}>
              <span>{item.name}</span>
              <MoneyValue amount={item.amount} hidden={hidden} size="small" />
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}

export function EnhancedSettings() {
  const { hidden, setHidden, error, loading, refresh } = useAppData();
  const [saved, setSaved] = useState(false);
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Controle suas preferências no cofrin."
      />
      <Card className="settings-list">
        <div className="setting">
          <div>
            <strong>Privacidade visual</strong>
            <p>Oculta valores em todos os módulos.</p>
          </div>
          <button
            className={`toggle ${hidden ? "on" : ""}`}
            aria-label="Alternar privacidade visual"
            onClick={() => setHidden(!hidden)}
          >
            <i />
          </button>
        </div>
        <div className="setting">
          <div>
            <strong>Dados da demonstração</strong>
            <p>
              {loading
                ? "Carregando dados…"
                : (error ?? "Dados sincronizados com a API mock.")}
            </p>
          </div>
          <Button variant="secondary" onClick={() => void refresh()}>
            {saved ? (
              <>
                <Check size={15} />
                Atualizado
              </>
            ) : (
              "Atualizar dados"
            )}
          </Button>
        </div>
        <div className="setting">
          <div>
            <strong>Preferências</strong>
            <p>As preferências visuais são mantidas somente neste navegador.</p>
          </div>
          <Button variant="ghost" onClick={() => setSaved(true)}>
            Salvar
          </Button>
        </div>
      </Card>
    </>
  );
}

function Status({ status }: { status: Transaction["status"] }) {
  const details = {
    PENDING: ["gold", "Pendente"],
    OVERDUE: ["red", "Atrasado"],
    RECEIVED: ["green", "Recebido"],
    PAID: ["neutral", "Pago"],
  } as const;
  const [tone, label] = details[status];
  return <Badge tone={tone}>{label}</Badge>;
}
