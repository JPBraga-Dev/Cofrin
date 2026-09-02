import { useMemo, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
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
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Download,
  Landmark,
  Plus,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  budgets,
  categoryData,
  chartData,
  initialGroups,
  initialPiggies,
  initialTransactions,
  mockUser,
  notifications,
} from "./mocks/data";
import type { Group, PiggyBank, Transaction, TransactionType } from "./types";
import {
  budgetStatus,
  formatCurrency,
  formatDate,
  formatShortDate,
  percent,
} from "./utils/format";
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  MoneyValue,
  PageHeader,
  Progress,
} from "./components/ui";
import { Header, MobileNavigation, Sidebar } from "./components/layout";
import {
  EnhancedBudgets,
  EnhancedCalendar,
  EnhancedCards,
  EnhancedGroupDetail,
  EnhancedGroups,
  EnhancedPiggyBanks,
  EnhancedReports,
  EnhancedSettings,
  EnhancedTransactions,
} from "./pages/EnhancedPages";

type AppState = {
  hidden: boolean;
  transactions: Transaction[];
  piggies: PiggyBank[];
  groups: Group[];
  addTransaction: (t: Transaction) => void;
  updatePiggy: (
    id: string,
    amount: number,
    type: "DEPOSIT" | "WITHDRAWAL",
  ) => void;
};
const preferences = {
  get: (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* Storage may be unavailable in private embeds; UI still works for this session. */
    }
  },
};
function Dashboard({ state }: { state: AppState }) {
  const navigate = useNavigate();
  const recent = state.transactions.slice(0, 5);
  const totalExpenses = 4328.5;
  return (
    <>
      <PageHeader
        eyebrow="Visão financeira"
        title={`Boa noite, ${mockUser.name.split(" ")[0]}`}
        description="Aqui está o resumo da sua vida financeira."
        action={
          <Button onClick={() => navigate("/transactions?new=1")}>
            <Plus size={16} /> Novo lançamento
          </Button>
        }
      />
      <div className="dashboard-grid">
        <div>
          <Card className="balance-card">
            <h2>Saldo total</h2>
            <MoneyValue amount={8420.35} hidden={state.hidden} size="large" />
            <div className="balance-footer">
              <span className="trend">↗ +8,4% no mês</span>
              <span>Disponível em 3 contas</span>
            </div>
          </Card>
          <div className="stats dashboard-section">
            {[
              {
                label: "Receitas",
                value: 7500,
                icon: ArrowUpRight,
                type: "income" as const,
                detail: "+4,1% vs. mês anterior",
              },
              {
                label: "Despesas",
                value: 4328.5,
                icon: ArrowDownRight,
                type: "expense" as const,
                detail: "-2,3% vs. mês anterior",
              },
              {
                label: "Guardado",
                value: 2100,
                icon: Wallet,
                type: undefined,
                detail: "28% da receita",
              },
              {
                label: "Comprometido",
                value: 1842.9,
                icon: CalendarDays,
                type: undefined,
                detail: "Próximos 30 dias",
              },
            ].map(({ label, value, icon: Icon, type, detail }) => (
              <Card className="stat-card" key={label}>
                <div className="stat-label">
                  <span>{label}</span>
                  <Icon size={16} />
                </div>
                <MoneyValue amount={value} type={type} hidden={state.hidden} />
                <small>{detail}</small>
              </Card>
            ))}
          </div>
        </div>
        <UpcomingBills
          hidden={state.hidden}
          onCalendar={() => navigate("/calendar")}
        />
      </div>
      <div className="two-col dashboard-section">
        <FinanceChart />
        <CategoryChart hidden={state.hidden} />
      </div>
      <div className="two-col dashboard-section">
        <RecentTransactions
          transactions={recent}
          hidden={state.hidden}
          onAll={() => navigate("/transactions")}
        />
        <GoalsPreview
          piggies={state.piggies}
          hidden={state.hidden}
          onAll={() => navigate("/piggy-banks")}
        />
      </div>
      <div className="dashboard-section">
        <GroupsPreview
          groups={state.groups}
          hidden={state.hidden}
          onAll={() => navigate("/groups")}
        />
      </div>
    </>
  );
}
function FinanceChart() {
  return (
    <Card className="chart-card">
      <div className="section-heading">
        <div>
          <h2>Receitas x despesas</h2>
          <p>Movimentação dos últimos 6 meses</p>
        </div>
        <div className="range-tabs">
          <button className="selected">6 meses</button>
          <button>12 meses</button>
          <button>Ano</button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="82%">
        <AreaChart data={chartData} margin={{ left: -20, right: 4 }}>
          <defs>
            <linearGradient id="incomeFill" x1="0" x2="0" y1="0" y2="1">
              <stop stopColor="#22c55e" stopOpacity=".3" />
              <stop offset="1" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#71717a", fontSize: 10 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#71717a", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              background: "#1c1c1f",
              border: "1px solid #39393e",
              borderRadius: 10,
              fontSize: 11,
            }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Area
            type="monotone"
            dataKey="income"
            name="Receitas"
            stroke="#4ade80"
            fill="url(#incomeFill)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Despesas"
            stroke="#f47272"
            fill="transparent"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
function CategoryChart({ hidden }: { hidden: boolean }) {
  const total = categoryData.reduce((a, b) => a + b.value, 0);
  return (
    <Card>
      <div className="section-heading">
        <div>
          <h2>Gastos por categoria</h2>
          <p>Agosto de 2026</p>
        </div>
      </div>
      <div style={{ height: 150 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={categoryData}
              innerRadius={48}
              outerRadius={68}
              dataKey="value"
              paddingAngle={3}
            >
              {categoryData.map((c) => (
                <Cell key={c.name} fill={c.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#1c1c1f",
                border: "1px solid #39393e",
                borderRadius: 10,
                fontSize: 11,
              }}
              formatter={(value: number) => formatCurrency(value, hidden)}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="category-list">
        {categoryData.slice(0, 5).map((c) => (
          <div className="category-row" key={c.name}>
            <i className="dot" style={{ background: c.color }} />
            <span>{c.name}</span>
            <strong>{formatCurrency(c.value, hidden)}</strong>
            <small>{percent(c.value, total)}%</small>
          </div>
        ))}
      </div>
    </Card>
  );
}
function UpcomingBills({
  hidden,
  onCalendar,
}: {
  hidden: boolean;
  onCalendar: () => void;
}) {
  const bills = [
    ["Internet", "2026-09-03", 119.9, "Pendente"],
    ["Netflix", "2026-09-05", 55.9, "Pendente"],
    ["Cartão principal", "2026-09-08", 1243.31, "Fatura"],
    ["Energia", "2026-09-12", 186.4, "Pendente"],
  ];
  return (
    <Card>
      <div className="section-heading">
        <div>
          <h2>Próximas contas</h2>
          <p>Organize-se com antecedência</p>
        </div>
        <Button variant="ghost" onClick={onCalendar}>
          Ver todas
        </Button>
      </div>
      {bills.map(([name, date, value, status]) => (
        <div className="bill-row" key={name as string}>
          <span className="bill-date">{formatShortDate(date as string)}</span>
          <div className="bill-info">
            <strong>{name}</strong>
            <small>{status}</small>
          </div>
          <MoneyValue amount={value as number} hidden={hidden} size="small" />
        </div>
      ))}
    </Card>
  );
}
function RecentTransactions({
  transactions,
  hidden,
  onAll,
}: {
  transactions: Transaction[];
  hidden: boolean;
  onAll: () => void;
}) {
  return (
    <Card>
      <div className="section-heading">
        <div>
          <h2>Atividade recente</h2>
          <p>Últimas movimentações</p>
        </div>
        <Button variant="ghost" onClick={onAll}>
          Ver lançamentos
        </Button>
      </div>
      {transactions.map((t) => (
        <div className="transaction-row" key={t.id}>
          <div className="transaction-icon">
            {t.type === "INCOME" ? (
              <ArrowUpRight size={16} />
            ) : (
              <ArrowDownRight size={16} />
            )}
          </div>
          <div className="transaction-info">
            <strong>{t.description}</strong>
            <small>
              {t.category} · {formatDate(t.date)}
            </small>
          </div>
          <MoneyValue
            amount={t.amount}
            type={t.type === "INCOME" ? "income" : "expense"}
            hidden={hidden}
            size="small"
          />
        </div>
      ))}
    </Card>
  );
}
function GoalsPreview({
  piggies,
  hidden,
  onAll,
}: {
  piggies: PiggyBank[];
  hidden: boolean;
  onAll: () => void;
}) {
  return (
    <Card>
      <div className="section-heading">
        <div>
          <h2>Seus porquinhos</h2>
          <p>Construindo seus objetivos</p>
        </div>
        <Button variant="ghost" onClick={onAll}>
          Ver todos
        </Button>
      </div>
      {piggies.slice(0, 3).map((p) => (
        <div className="bill-row" key={p.id}>
          <span
            className="piggy-icon"
            style={{
              margin: 0,
              width: 31,
              height: 31,
              borderRadius: 9,
              fontSize: 14,
            }}
          >
            {p.icon}
          </span>
          <div className="bill-info">
            <strong>{p.name}</strong>
            <Progress
              value={percent(p.currentAmount, p.targetAmount)}
              color="#f472b6"
            />
          </div>
          <MoneyValue amount={p.currentAmount} hidden={hidden} size="small" />
        </div>
      ))}
    </Card>
  );
}
function GroupsPreview({
  groups,
  hidden,
  onAll,
}: {
  groups: Group[];
  hidden: boolean;
  onAll: () => void;
}) {
  return (
    <Card>
      <div className="section-heading">
        <div>
          <h2>Planejamento em grupo</h2>
          <p>O que vocês estão construindo juntos</p>
        </div>
        <Button variant="ghost" onClick={onAll}>
          Explorar grupos
        </Button>
      </div>
      <div className="group-grid">
        {groups.map((g) => (
          <div className="group-card" key={g.id}>
            <div className="group-top">
              <div className="group-emoji">{g.emoji}</div>
              <div>
                <h2>{g.name}</h2>
                <p>
                  {g.members.length} participantes · {g.type}
                </p>
              </div>
            </div>
            {g.targetAmount && (
              <>
                <div className="piggy-amounts">
                  <MoneyValue amount={g.fund} hidden={hidden} />
                  <span>de {formatCurrency(g.targetAmount, hidden)}</span>
                </div>
                <Progress
                  value={percent(g.fund, g.targetAmount)}
                  color={g.color}
                />
              </>
            )}
            <div className="group-footer">
              <div className="avatar-group">
                {g.members.slice(0, 4).map((m) => (
                  <div className="avatar" key={m.id}>
                    {m.initials}
                  </div>
                ))}
              </div>
              <span>{formatShortDate(g.eventDate)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
function TransactionsPage({ state }: { state: AppState }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [open, setOpen] = useState(
    new URLSearchParams(location.search).has("new"),
  );
  const displayed = state.transactions.filter(
    (t) =>
      (type === "ALL" || t.type === type) &&
      `${t.description}${t.category}${t.account}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const income = state.transactions
      .filter((t) => t.type === "INCOME")
      .reduce((s, t) => s + t.amount, 0),
    expense = state.transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((s, t) => s + t.amount, 0);
  return (
    <>
      <PageHeader
        title="Lançamentos"
        description="Acompanhe e organize cada movimento da sua vida financeira."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Novo lançamento
          </Button>
        }
      />
      <div className="summary-strip">
        <div>
          <span>Entradas no período</span>
          <MoneyValue amount={income} type="income" hidden={state.hidden} />
        </div>
        <div>
          <span>Saídas no período</span>
          <MoneyValue amount={expense} type="expense" hidden={state.hidden} />
        </div>
        <div>
          <span>Saldo do período</span>
          <MoneyValue amount={income - expense} hidden={state.hidden} />
        </div>
      </div>
      <Card>
        <div className="filters">
          <input
            placeholder="Buscar lançamento"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="ALL">Todos os tipos</option>
            <option value="INCOME">Receitas</option>
            <option value="EXPENSE">Despesas</option>
          </select>
          <select>
            <option>Todas categorias</option>
            {categoryData.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setType("ALL");
            }}
          >
            Limpar filtros
          </Button>
        </div>
        {displayed.length ? (
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.description}</strong>
                      {t.installment && <small> · {t.installment}</small>}
                    </td>
                    <td>{t.category}</td>
                    <td>{formatDate(t.date)}</td>
                    <td>{t.account}</td>
                    <td>
                      <Badge
                        tone={
                          t.status === "PENDING"
                            ? "gold"
                            : t.type === "INCOME"
                              ? "green"
                              : "neutral"
                        }
                      >
                        {t.status === "PENDING"
                          ? "Pendente"
                          : t.status === "RECEIVED"
                            ? "Recebido"
                            : "Pago"}
                      </Badge>
                    </td>
                    <td>
                      <MoneyValue
                        amount={t.amount}
                        type={t.type === "INCOME" ? "income" : "expense"}
                        hidden={state.hidden}
                      />
                    </td>
                    <td>
                      <Button variant="ghost">•••</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Nenhum lançamento encontrado"
            detail="Tente alterar seus filtros ou adicione uma movimentação."
          />
        )}
      </Card>
      <TransactionDrawer
        open={open}
        close={() => setOpen(false)}
        add={state.addTransaction}
      />
    </>
  );
}
function TransactionDrawer({
  open,
  close,
  add,
}: {
  open: boolean;
  close: () => void;
  add: (t: Transaction) => void;
}) {
  const [kind, setKind] = useState<TransactionType>("EXPENSE");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || Number(amount) <= 0) {
      setError("Informe uma descrição e um valor maior que zero.");
      return;
    }
    add({
      id: `t-${Date.now()}`,
      description,
      amount: Number(amount),
      type: kind,
      nature: "PERSONAL",
      date: new Date().toISOString().slice(0, 10),
      category: kind === "INCOME" ? "Outras receitas" : "Outros",
      account: "Conta principal",
      status: kind === "INCOME" ? "RECEIVED" : "PAID",
      paymentMethod: "PIX",
    });
    close();
  };
  return (
    <Drawer open={open} onClose={close}>
      <h2>Novo lançamento</h2>
      <p>Registre uma receita ou despesa em poucos segundos.</p>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="form-field full">
            <label>Tipo</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as TransactionType)}
            >
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
              <option value="TRANSFER">Transferência</option>
            </select>
          </div>
          <div className="form-field full">
            <label>Descrição</label>
            <input
              autoFocus
              placeholder="Ex.: Supermercado"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Valor</label>
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(",", "."))}
            />
          </div>
          <div className="form-field">
            <label>Data</label>
            <input
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="form-field">
            <label>Categoria</label>
            <select>
              <option>
                {kind === "INCOME" ? "Outras receitas" : "Outros"}
              </option>
              {categoryData.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Conta</label>
            <select>
              <option>Conta principal</option>
              <option>Cartão Nubank</option>
              <option>Carteira</option>
            </select>
          </div>
          <div className="form-field full">
            <label>Observação</label>
            <textarea placeholder="Adicione detalhes se quiser" />
          </div>
        </div>
        {error && <p style={{ color: "#fca5a5", fontSize: 11 }}>{error}</p>}
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit">Salvar lançamento</Button>
        </div>
      </form>
    </Drawer>
  );
}
function PiggyBanksPage({ state }: { state: AppState }) {
  const [selected, setSelected] = useState<PiggyBank | null>(null);
  const total = state.piggies.reduce((s, p) => s + p.currentAmount, 0);
  return (
    <>
      <PageHeader
        eyebrow="Metas pessoais"
        title="Porquinhos"
        description="Dê destino ao dinheiro que vai construir seu futuro."
        action={
          <Button variant="pink">
            <Plus size={16} /> Criar porquinho
          </Button>
        }
      />
      <div className="summary-strip">
        <div>
          <span>Total guardado</span>
          <MoneyValue amount={total} hidden={state.hidden} />
        </div>
        <div>
          <span>Metas ativas</span>
          <strong>
            {state.piggies.filter((p) => p.status === "ACTIVE").length}
          </strong>
        </div>
        <div>
          <span>Concluídas</span>
          <strong>
            {state.piggies.filter((p) => p.status === "COMPLETED").length}
          </strong>
        </div>
      </div>
      <div className="piggy-grid">
        {state.piggies.map((p) => (
          <Card className="piggy-card" key={p.id}>
            <div className="piggy-icon">{p.icon}</div>
            <h2>{p.name}</h2>
            <p>{p.description}</p>
            <div className="piggy-amounts">
              <MoneyValue amount={p.currentAmount} hidden={state.hidden} />
              <span>de {formatCurrency(p.targetAmount, state.hidden)}</span>
            </div>
            <Progress
              value={percent(p.currentAmount, p.targetAmount)}
              color="#f472b6"
            />
            <div className="piggy-meta">
              <span>{percent(p.currentAmount, p.targetAmount)}% concluído</span>
              <span>até {formatShortDate(p.deadline)}</span>
            </div>
            <div className="piggy-actions">
              <Button variant="pink" onClick={() => setSelected(p)}>
                Gerenciar
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  state.updatePiggy(p.id, p.monthlyContribution, "DEPOSIT")
                }
              >
                Aportar {formatCurrency(p.monthlyContribution)}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <PiggyDrawer
        piggy={selected}
        close={() => setSelected(null)}
        update={state.updatePiggy}
        hidden={state.hidden}
      />
    </>
  );
}
function PiggyDrawer({
  piggy,
  close,
  update,
  hidden,
}: {
  piggy: PiggyBank | null;
  close: () => void;
  update: AppState["updatePiggy"];
  hidden: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  if (!piggy) return null;
  const remaining = Math.max(0, piggy.targetAmount - piggy.currentAmount);
  const months =
    piggy.monthlyContribution > 0
      ? Math.ceil(remaining / piggy.monthlyContribution)
      : null;
  return (
    <Drawer open={true} onClose={close}>
      <h2>
        {piggy.icon} {piggy.name}
      </h2>
      <p>{piggy.description}</p>
      <Card>
        <span style={{ color: "#a1a1aa", fontSize: 11 }}>Progresso</span>
        <div className="piggy-amounts">
          <MoneyValue amount={piggy.currentAmount} hidden={hidden} />
          <span>de {formatCurrency(piggy.targetAmount, hidden)}</span>
        </div>
        <Progress
          value={percent(piggy.currentAmount, piggy.targetAmount)}
          color="#f472b6"
        />
        <p style={{ fontSize: 11, color: "#a1a1aa" }}>
          {months
            ? `Mantendo o aporte, você conclui em cerca de ${months} meses.`
            : "Meta sem previsão de conclusão."}
        </p>
      </Card>
      <div className="form-field" style={{ marginTop: 18 }}>
        <label>Movimentação</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
        >
          <option value="DEPOSIT">Novo aporte</option>
          <option value="WITHDRAWAL">Retirada</option>
        </select>
      </div>
      <div className="form-field">
        <label>Valor</label>
        <input
          placeholder="0,00"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(",", "."))}
        />
      </div>
      <Button
        variant={mode === "DEPOSIT" ? "pink" : "secondary"}
        onClick={() => {
          const n = Number(amount);
          if (n > 0) {
            update(piggy.id, n, mode);
            setAmount("");
          }
        }}
      >
        {mode === "DEPOSIT" ? "Registrar aporte" : "Registrar retirada"}
      </Button>
      <h3 style={{ fontSize: 13, marginTop: 27 }}>Histórico</h3>
      {piggy.movements.map((m) => (
        <div className="bill-row" key={m.id}>
          <span>{m.type === "DEPOSIT" ? "↗" : "↘"}</span>
          <div className="bill-info">
            <strong>{m.description}</strong>
            <small>{formatDate(m.date)}</small>
          </div>
          <MoneyValue
            amount={m.amount}
            type={m.type === "DEPOSIT" ? "income" : "expense"}
            hidden={hidden}
            size="small"
          />
        </div>
      ))}
    </Drawer>
  );
}
function GroupsPage({ state }: { state: AppState }) {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        eyebrow="Planejamento coletivo"
        title="Grupos"
        description="Metas, contribuições e despesas compartilhadas em um só lugar."
        action={
          <Button>
            <Plus size={16} /> Criar grupo
          </Button>
        }
      />
      <div className="group-grid">
        {state.groups.map((g) => (
          <Card className="group-card" key={g.id}>
            <div className="group-top">
              <div className="group-emoji">{g.emoji}</div>
              <div>
                <h2>{g.name}</h2>
                <p>
                  {g.type} · {formatShortDate(g.eventDate)}
                </p>
              </div>
            </div>
            <p>{g.description}</p>
            <div className="piggy-amounts">
              <MoneyValue amount={g.fund} hidden={state.hidden} />
              <span>
                {g.targetAmount
                  ? `de ${formatCurrency(g.targetAmount, state.hidden)}`
                  : "fundo coletivo"}
              </span>
            </div>
            {g.targetAmount && (
              <Progress
                value={percent(g.fund, g.targetAmount)}
                color={g.color}
              />
            )}
            <div className="group-footer">
              <div className="avatar-group">
                {g.members.map((m) => (
                  <div className="avatar" key={m.id}>
                    {m.initials}
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                onClick={() => navigate(`/groups/${g.id}`)}
              >
                Abrir <ChevronRight size={14} />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
function GroupDetail({ state }: { state: AppState }) {
  const { id } = useParams();
  const group = state.groups.find((g) => g.id === id);
  const [tab, setTab] = useState("Visão geral");
  if (!group) return <Navigate to="/groups" replace />;
  const settlements = settle(group.members);
  return (
    <div className="group-detail">
      <button className="button ghost" onClick={() => history.back()}>
        ← Voltar aos grupos
      </button>
      <div className="detail-hero">
        <div>
          <p className="eyebrow">{group.type}</p>
          <h1>
            {group.emoji} {group.name}
          </h1>
          <p>
            {group.description} · {formatDate(group.eventDate)}
          </p>
        </div>
        <Button>
          <Plus size={15} /> Registrar atividade
        </Button>
      </div>
      <div className="summary-strip">
        <div>
          <span>Fundo atual</span>
          <MoneyValue amount={group.fund} hidden={state.hidden} />
        </div>
        <div>
          <span>Total gasto</span>
          <MoneyValue
            amount={group.totalExpenses}
            type="expense"
            hidden={state.hidden}
          />
        </div>
        <div>
          <span>Meta coletiva</span>
          <MoneyValue amount={group.targetAmount ?? 0} hidden={state.hidden} />
        </div>
      </div>
      <div className="tabs">
        {[
          "Visão geral",
          "Contribuições",
          "Despesas",
          "Participantes",
          "Acertos",
        ].map((x) => (
          <button
            className={tab === x ? "active" : ""}
            onClick={() => setTab(x)}
            key={x}
          >
            {x}
          </button>
        ))}
      </div>
      {tab === "Visão geral" && (
        <div className="two-col">
          <Card>
            <div className="section-heading">
              <div>
                <h2>Progresso do grupo</h2>
                <p>Arrecadação para o objetivo</p>
              </div>
            </div>
            {group.targetAmount && (
              <>
                <div className="piggy-amounts">
                  <MoneyValue amount={group.fund} hidden={state.hidden} />
                  <span>
                    de {formatCurrency(group.targetAmount, state.hidden)}
                  </span>
                </div>
                <Progress
                  value={percent(group.fund, group.targetAmount)}
                  color={group.color}
                />
              </>
            )}
            <h3 style={{ fontSize: 13, marginTop: 28 }}>Atividade recente</h3>
            {group.activity.map((a) => (
              <div className="bill-row" key={a}>
                <span className="transaction-icon">
                  <ReceiptText size={14} />
                </span>
                <div className="bill-info">
                  <strong>{a}</strong>
                  <small>Hoje</small>
                </div>
              </div>
            ))}
          </Card>
          <Card>
            <div className="section-heading">
              <div>
                <h2>Resumo individual</h2>
                <p>Seu lugar no grupo</p>
              </div>
            </div>
            <div className="metric-list">
              <div>
                <span>Sua contribuição</span>
                <MoneyValue
                  amount={group.members[0].contribution}
                  hidden={state.hidden}
                />
              </div>
              <div>
                <span>Você deve</span>
                <MoneyValue
                  amount={Math.max(0, -group.members[0].balance)}
                  type="expense"
                  hidden={state.hidden}
                />
              </div>
              <div>
                <span>Você recebe</span>
                <MoneyValue
                  amount={Math.max(0, group.members[0].balance)}
                  type="income"
                  hidden={state.hidden}
                />
              </div>
            </div>
          </Card>
        </div>
      )}
      {tab === "Participantes" && (
        <Card>
          <div className="members-grid">
            {group.members.map((m) => (
              <div className="member-row" key={m.id}>
                <div className="avatar">{m.initials}</div>
                <span>{m.name}</span>
                <MoneyValue
                  amount={Math.abs(m.balance)}
                  type={m.balance >= 0 ? "income" : "expense"}
                  hidden={state.hidden}
                  size="small"
                />
              </div>
            ))}
          </div>
        </Card>
      )}
      {tab === "Contribuições" && (
        <Card>
          <h2 style={{ fontSize: 14, marginTop: 0 }}>
            Contribuições recebidas
          </h2>
          {group.members.map((m) => (
            <div className="bill-row" key={m.id}>
              <div className="avatar">{m.initials}</div>
              <div className="bill-info">
                <strong>{m.name}</strong>
                <small>Aporte confirmado</small>
              </div>
              <MoneyValue
                amount={m.contribution}
                type="income"
                hidden={state.hidden}
                size="small"
              />
            </div>
          ))}
        </Card>
      )}
      {tab === "Despesas" && (
        <Card>
          <h2 style={{ fontSize: 14, marginTop: 0 }}>
            Despesas compartilhadas
          </h2>
          <div className="bill-row">
            <span className="transaction-icon">🏨</span>
            <div className="bill-info">
              <strong>Hospedagem Jeri</strong>
              <small>Pago por João · fundo do grupo</small>
            </div>
            <MoneyValue
              amount={1200}
              type="expense"
              hidden={state.hidden}
              size="small"
            />
          </div>
        </Card>
      )}
      {tab === "Acertos" && (
        <Card>
          <div className="section-heading">
            <div>
              <h2>Acerto inteligente</h2>
              <p>Menor número de transferências necessário</p>
            </div>
            <Badge tone="pink">{settlements.length} transferências</Badge>
          </div>
          {settlements.map((s) => (
            <div className="bill-row" key={`${s.from}${s.to}`}>
              <div className="avatar">{s.from.slice(0, 2)}</div>
              <div className="bill-info">
                <strong>
                  {s.from}{" "}
                  <ChevronRight size={12} style={{ verticalAlign: "middle" }} />{" "}
                  {s.to}
                </strong>
                <small>Acerto sugerido</small>
              </div>
              <MoneyValue
                amount={s.amount}
                hidden={state.hidden}
                size="small"
              />
              <Button variant="secondary">Marcar pago</Button>
            </div>
          ))}
          {!settlements.length && (
            <EmptyState
              title="Tudo acertado"
              detail="Não há pagamentos pendentes entre participantes."
            />
          )}
        </Card>
      )}
    </div>
  );
}
function settle(members: Group["members"]) {
  const debtors = members
    .filter((m) => m.balance < 0)
    .map((m) => ({ name: m.name, amount: -m.balance }));
  const creditors = members
    .filter((m) => m.balance > 0)
    .map((m) => ({ name: m.name, amount: m.balance }));
  const result: { from: string; to: string; amount: number }[] = [];
  let i = 0,
    j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    result.push({ from: debtors[i].name, to: creditors[j].name, amount });
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }
  return result;
}
function CardsPage({ state }: { state: AppState }) {
  return (
    <>
      <PageHeader
        title="Meus cartões"
        description="Acompanhe limites, faturas e compras parceladas."
        action={
          <Button>
            <Plus size={16} /> Adicionar cartão
          </Button>
        }
      />
      <div className="two-col">
        <Card className="balance-card">
          <p style={{ color: "#a1a1aa", fontSize: 11, margin: 0 }}>
            Cartão principal
          </p>
          <h2 style={{ fontSize: 17, margin: "13px 0 28px" }}>
            Nubank · Mastercard
          </h2>
          <p style={{ fontSize: 20, letterSpacing: 3 }}>•••• 4582</p>
          <div className="piggy-amounts">
            <span>Limite disponível</span>
            <MoneyValue amount={3756.69} hidden={state.hidden} />
          </div>
          <Progress value={31} color="#a78bfa" />
          <div className="balance-footer">
            <span>Limite total {formatCurrency(5000, state.hidden)}</span>
            <span>Fecha dia 04</span>
            <span>Vence dia 11</span>
          </div>
        </Card>
        <Card>
          <div className="section-heading">
            <div>
              <h2>Fatura atual</h2>
              <p>Fecha em 4 dias</p>
            </div>
            <Badge tone="gold">Vence em 11 dias</Badge>
          </div>
          <MoneyValue amount={1243.31} hidden={state.hidden} size="large" />
          <p style={{ fontSize: 11, color: "#a1a1aa" }}>
            Compras já contabilizadas como despesas — o pagamento da fatura não
            duplica o gasto.
          </p>
          <Button variant="secondary">Ver fatura completa</Button>
        </Card>
      </div>
      <Card className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Compras da fatura</h2>
            <p>Setembro de 2026</p>
          </div>
        </div>
        {state.transactions
          .filter((t) => t.account === "Cartão Nubank")
          .map((t) => (
            <div className="bill-row" key={t.id}>
              <span className="bill-date">{formatShortDate(t.date)}</span>
              <div className="bill-info">
                <strong>
                  {t.description} {t.installment && `· ${t.installment}`}
                </strong>
                <small>{t.category}</small>
              </div>
              <MoneyValue
                amount={t.amount}
                type="expense"
                hidden={state.hidden}
                size="small"
              />
            </div>
          ))}
      </Card>
      <div className="stats dashboard-section">
        {[
          ["Setembro", 1243],
          ["Outubro", 980],
          ["Novembro", 754],
          ["Dezembro", 612],
        ].map(([month, value]) => (
          <Card key={month as string}>
            <span style={{ fontSize: 11, color: "#a1a1aa" }}>{month}</span>
            <MoneyValue amount={value as number} hidden={state.hidden} />
          </Card>
        ))}
      </div>
    </>
  );
}
function BudgetsPage({ state }: { state: AppState }) {
  return (
    <>
      <PageHeader
        title="Orçamentos"
        description="Defina limites e acompanhe o ritmo dos seus gastos."
        action={
          <Button>
            <Plus size={16} /> Novo orçamento
          </Button>
        }
      />
      <div className="budget-grid">
        {budgets.map((b) => {
          const status = budgetStatus(b.spent, b.limit);
          return (
            <Card className="budget-card" key={b.id}>
              <h2>{b.category}</h2>
              <div className="budget-values">
                <MoneyValue amount={b.spent} hidden={state.hidden} />
                <span style={{ color: "#71717a" }}>
                  de {formatCurrency(b.limit, state.hidden)}
                </span>
              </div>
              <Progress
                value={percent(b.spent, b.limit)}
                color={
                  status === "ultrapassado"
                    ? "#ef4444"
                    : status === "em alerta"
                      ? "#f5c451"
                      : b.color
                }
              />
              <small>
                {status === "ultrapassado"
                  ? `${formatCurrency(b.spent - b.limit, state.hidden)} acima do limite`
                  : status === "em alerta"
                    ? "Atenção: você está próximo do limite."
                    : `${formatCurrency(b.limit - b.spent, state.hidden)} ainda disponível`}
              </small>
              <div style={{ marginTop: 14 }}>
                <Badge
                  tone={
                    status === "ultrapassado"
                      ? "red"
                      : status === "em alerta"
                        ? "gold"
                        : "green"
                  }
                >
                  {status}
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
function CalendarPage() {
  const days = Array.from({ length: 35 }, (_, i) => i - 4);
  const events: { [key: number]: string } = {
    3: "Internet · R$ 119",
    5: "Netflix · R$ 56",
    8: "Fatura Nubank",
    12: "Energia · R$ 186",
    20: "Churrasco da turma",
  };
  return (
    <>
      <PageHeader
        title="Calendário"
        description="Veja compromissos financeiros e eventos importantes."
        action={<Button variant="secondary">‹ Agosto 2026 ›</Button>}
      />
      <Card>
        <div className="calendar-grid">
          {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((x) => (
            <div
              style={{
                minHeight: 20,
                border: 0,
                color: "#71717a",
                fontSize: 10,
                fontWeight: 800,
              }}
              key={x}
            >
              {x}
            </div>
          ))}
          {days.map((d, i) => (
            <div className={d === 31 ? "today" : ""} key={i}>
              {d > 0 && d <= 31 ? d : ""}
              {events[d] && <span className="calendar-event">{events[d]}</span>}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
function ReportsPage({ state }: { state: AppState }) {
  const navigate = useNavigate();
  const download = () => {
    const csv = [
      "Data,Descrição,Tipo,Categoria,Conta,Status,Valor",
      ...state.transactions.map(
        (t) =>
          `${t.date},${t.description},${t.type},${t.category},${t.account},${t.status},${t.amount}`,
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "cofrin-lancamentos.csv";
    a.click();
  };
  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Entenda seus hábitos e tome decisões com clareza."
        action={
          <Button variant="secondary" onClick={download}>
            <Download size={15} /> Exportar CSV
          </Button>
        }
      />
      <div className="report-grid">
        <FinanceChart />
        <Card>
          <div className="section-heading">
            <div>
              <h2>Saúde financeira</h2>
              <p>Indicadores do mês</p>
            </div>
          </div>
          <div className="metric-list">
            <div>
              <span>Taxa de economia</span>
              <strong style={{ color: "#4ade80" }}>42,3%</strong>
            </div>
            <div>
              <span>Renda comprometida</span>
              <strong>24,6%</strong>
            </div>
            <div>
              <span>Orçamentos saudáveis</span>
              <strong>2 de 4</strong>
            </div>
            <div>
              <span>Próxima meta</span>
              <strong>Viagem</strong>
            </div>
          </div>
        </Card>
      </div>
      <Card className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Insights do cofrin</h2>
            <p>Leituras a partir das suas movimentações</p>
          </div>
        </div>
        <div className="stats">
          <div>
            <Badge tone="green">Bom ritmo</Badge>
            <p style={{ fontSize: 12 }}>
              Você reduziu as despesas em 2,3% em relação ao mês passado.
            </p>
          </div>
          <div>
            <Badge tone="gold">Atenção</Badge>
            <p style={{ fontSize: 12 }}>
              Lazer ultrapassou o orçamento em{" "}
              {formatCurrency(45, state.hidden)}.
            </p>
          </div>
          <div>
            <Badge tone="pink">Meta</Badge>
            <p style={{ fontSize: 12 }}>
              Seu porquinho de viagem já está na metade do caminho.
            </p>
          </div>
          <div>
            <Button variant="ghost" onClick={() => navigate("/budgets")}>
              Revisar orçamentos <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
function SettingsPage({
  state,
  setHidden,
}: {
  state: AppState;
  setHidden: (v: boolean) => void;
}) {
  const [compact, setCompact] = useState(
    preferences.get("cofrin-compact") === "true",
  );
  const [alerts, setAlerts] = useState(true);
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Ajuste sua experiência no cofrin."
      />
      <Card className="settings-list">
        <div className="setting">
          <div>
            <strong>Privacidade visual</strong>
            <p>Ocultar valores financeiros em toda a aplicação.</p>
          </div>
          <button
            className={`toggle ${state.hidden ? "on" : ""}`}
            onClick={() => setHidden(!state.hidden)}
          >
            <i />
          </button>
        </div>
        <div className="setting">
          <div>
            <strong>Sidebar compacta</strong>
            <p>Prefira o menu lateral com apenas ícones.</p>
          </div>
          <button
            className={`toggle ${compact ? "on" : ""}`}
            onClick={() => {
              const next = !compact;
              setCompact(next);
              preferences.set("cofrin-compact", String(next));
            }}
          >
            <i />
          </button>
        </div>
        <div className="setting">
          <div>
            <strong>Notificações internas</strong>
            <p>Receba lembretes de faturas, metas e orçamentos.</p>
          </div>
          <button
            className={`toggle ${alerts ? "on" : ""}`}
            onClick={() => setAlerts(!alerts)}
          >
            <i />
          </button>
        </div>
        <div className="setting">
          <div>
            <strong>Fonte de dados</strong>
            <p>
              Usando dados mockados locais. Supabase pode ser conectado pelas
              variáveis de ambiente.
            </p>
          </div>
          <Badge tone="neutral">Mock</Badge>
        </div>
      </Card>
    </>
  );
}
function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const register = location.pathname === "/register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("joao@cofrin.app");
  const [password, setPassword] = useState("cofrin");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (register && name.trim().length < 2) {
      setError("Informe seu nome.");
      return;
    }
    if (register && (password.length < 6 || password !== confirm)) {
      setError(
        "Use uma senha de pelo menos 6 caracteres e confirme corretamente.",
      );
      return;
    }
    preferences.set("cofrin-demo", "true");
    navigate("/dashboard");
  };
  return (
    <div className="auth-page">
      <div className="auth-layout">
        <div className="auth-branding">
          <span className="logo-mark">C</span>
          <h1>
            Controle hoje.
            <br />
            Planeje amanhã.
            <br />
            <em>Compartilhe objetivos.</em>
          </h1>
          <p>
            cofrin reúne a sua vida financeira pessoal e os planos que vocês
            constroem juntos.
          </p>
        </div>
        <Card className="auth-card">
          <div className="brand-auth">
            <span className="logo-mark">C</span> cofrin
          </div>
          <h1>
            {register ? "Crie sua conta" : "Sua vida financeira, em ordem."}
          </h1>
          <p>
            {register
              ? "Comece a organizar seu dinheiro em minutos."
              : "Entre na demonstração para explorar o seu cofrinho digital."}
          </p>
          <form onSubmit={submit}>
            {register && (
              <div className="form-field">
                <label>Nome</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Seu nome"
                />
              </div>
            )}
            <div className="form-field">
              <label>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {register && (
              <div className="form-field">
                <label>Confirmar senha</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </div>
            )}
            {error && <p className="form-error">{error}</p>}
            <p className="demo-hint">
              Dados de demonstração: qualquer credencial válida libera o acesso.
            </p>
            <Button
              type="submit"
              style={{ width: "100%", justifyContent: "center" }}
            >
              {register ? "Criar conta" : "Entrar na demonstração"}
            </Button>
          </form>
          <p className="auth-switch">
            {register ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Entrar" : "Criar conta"}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
function Shell() {
  const [compact, setCompact] = useState(
    preferences.get("cofrin-compact") === "true",
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hidden, setHidden] = useState(
    preferences.get("cofrin-hidden") === "true",
  );
  const [transactions, setTransactions] = useState(initialTransactions);
  const [piggies, setPiggies] = useState(initialPiggies);
  const [groups] = useState(initialGroups);
  const state = useMemo<AppState>(
    () => ({
      hidden,
      transactions,
      piggies,
      groups,
      addTransaction: (t) => setTransactions((prev) => [t, ...prev]),
      updatePiggy: (id, amount, type) =>
        setPiggies((prev) =>
          prev.map((p) =>
            p.id !== id
              ? p
              : {
                  ...p,
                  currentAmount: Math.max(
                    0,
                    p.currentAmount + (type === "DEPOSIT" ? amount : -amount),
                  ),
                  movements: [
                    {
                      id: `m-${Date.now()}`,
                      type,
                      amount,
                      date: new Date().toISOString().slice(0, 10),
                      description:
                        type === "DEPOSIT"
                          ? "Aporte manual"
                          : "Retirada manual",
                    },
                    ...p.movements,
                  ],
                },
          ),
        ),
    }),
    [hidden, transactions, piggies, groups],
  );
  const updateHidden = (v: boolean) => {
    setHidden(v);
    preferences.set("cofrin-hidden", String(v));
  };
  return (
    <div className="app-shell">
      <Sidebar
        compact={compact}
        setCompact={(v) => {
          setCompact(v);
          preferences.set("cofrin-compact", String(v));
        }}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <Header
        hidden={hidden}
        setHidden={updateHidden}
        onMenu={() => setMobileOpen(true)}
      />
      <main className="main">
        <Routes>
          <Route path="/dashboard" element={<Dashboard state={state} />} />
          <Route
            path="/transactions"
            element={<EnhancedTransactions state={state} />}
          />
          <Route
            path="/piggy-banks"
            element={<EnhancedPiggyBanks state={state} />}
          />
          <Route path="/groups" element={<EnhancedGroups state={state} />} />
          <Route
            path="/groups/:id"
            element={<EnhancedGroupDetail state={state} />}
          />
          <Route path="/cards" element={<EnhancedCards state={state} />} />
          <Route
            path="/budgets"
            element={<EnhancedBudgets hidden={state.hidden} />}
          />
          <Route path="/calendar" element={<EnhancedCalendar />} />
          <Route path="/reports" element={<EnhancedReports state={state} />} />
          <Route
            path="/settings"
            element={
              <EnhancedSettings
                hidden={state.hidden}
                setHidden={updateHidden}
              />
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <MobileNavigation />
    </div>
  );
}
function NotFound() {
  return (
    <>
      <PageHeader
        title="Página não encontrada"
        description="O endereço que você tentou acessar não existe."
      />
      <Button onClick={() => (location.href = "/dashboard")}>
        Voltar ao início
      </Button>
    </>
  );
}
export default function App() {
  const authenticated = preferences.get("cofrin-demo") === "true";
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Login />} />
      <Route
        path="/*"
        element={authenticated ? <Shell /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}
