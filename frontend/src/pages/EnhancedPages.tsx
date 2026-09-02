import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CalendarDays,
  Check,
  CreditCard,
  Plus,
  Trash2,
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
import type { Budget, Group, PiggyBank, Transaction } from "../types";
import { budgets as seededBudgets } from "../mocks/data";
import {
  budgetFormSchema,
  groupFormSchema,
  piggyFormSchema,
  transactionFormSchema,
} from "../services/schemas";
import {
  budgetStatus,
  formatCurrency,
  formatDate,
  formatShortDate,
  percent,
} from "../utils/format";
import {
  Badge,
  Button,
  Card,
  Drawer,
  MoneyValue,
  PageHeader,
  Progress,
} from "../components/ui";

type State = {
  hidden: boolean;
  piggies: PiggyBank[];
  groups: Group[];
  transactions: Transaction[];
};
const emptyPiggy: Pick<
  PiggyBank,
  | "name"
  | "description"
  | "targetAmount"
  | "monthlyContribution"
  | "deadline"
  | "icon"
> = {
  name: "",
  description: "",
  targetAmount: 0,
  monthlyContribution: 0,
  deadline: "",
  icon: "🐷",
};

export function EnhancedPiggyBanks({ state }: { state: State }) {
  const [piggies, setPiggies] = useState(state.piggies);
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<PiggyBank | null>(null);
  const total = piggies.reduce((sum, p) => sum + p.currentAmount, 0);
  const add = (draft: typeof emptyPiggy) => {
    const validation = piggyFormSchema.safeParse(draft);
    if (!validation.success) return validation.error.issues[0].message;
    setPiggies((items) => [
      ...items,
      {
        id: `p-${Date.now()}`,
        currentAmount: 0,
        status: "ACTIVE",
        movements: [],
        ...draft,
      },
    ]);
    setCreate(false);
    return null;
  };
  const move = (id: string, amount: number, type: "DEPOSIT" | "WITHDRAWAL") =>
    setPiggies((items) =>
      items.map((p) =>
        p.id !== id
          ? p
          : {
              ...p,
              currentAmount: Math.max(
                0,
                p.currentAmount + (type === "DEPOSIT" ? amount : -amount),
              ),
              status:
                p.currentAmount + (type === "DEPOSIT" ? amount : -amount) >=
                p.targetAmount
                  ? "COMPLETED"
                  : p.status,
              movements: [
                {
                  id: `m-${Date.now()}`,
                  type,
                  amount,
                  date: new Date().toISOString().slice(0, 10),
                  description:
                    type === "DEPOSIT"
                      ? "Aporte registrado"
                      : "Retirada registrada",
                },
                ...p.movements,
              ],
            },
      ),
    );
  return (
    <>
      <PageHeader
        eyebrow="Metas pessoais"
        title="Porquinhos"
        description="Transforme intenções em reservas reais."
        action={
          <Button variant="pink" onClick={() => setCreate(true)}>
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
          <strong>{piggies.filter((p) => p.status === "ACTIVE").length}</strong>
        </div>
        <div>
          <span>Concluídas</span>
          <strong>
            {piggies.filter((p) => p.status === "COMPLETED").length}
          </strong>
        </div>
      </div>
      <div className="piggy-grid">
        {piggies.map((p) => (
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
              color={p.status === "COMPLETED" ? "#f5c451" : "#f472b6"}
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
                onClick={() => move(p.id, p.monthlyContribution, "DEPOSIT")}
              >
                Aportar
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <PiggyFormDrawer
        open={create}
        close={() => setCreate(false)}
        save={add}
      />
      <PiggyMovementDrawer
        piggy={selected}
        hidden={state.hidden}
        close={() => setSelected(null)}
        move={move}
      />
    </>
  );
}
function PiggyFormDrawer({
  open,
  close,
  save,
}: {
  open: boolean;
  close: () => void;
  save: (data: typeof emptyPiggy) => string | null;
}) {
  const [draft, setDraft] = useState(emptyPiggy);
  const [error, setError] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = save(draft);
    if (result) setError(result);
  };
  return (
    <Drawer open={open} onClose={close}>
      <h2>Novo porquinho</h2>
      <p>Defina uma meta e acompanhe cada aporte.</p>
      <form onSubmit={submit}>
        <div className="form-grid">
          <Field
            label="Nome"
            value={draft.name}
            set={(value) => setDraft({ ...draft, name: value })}
          />
          <Field
            label="Ícone"
            value={draft.icon}
            set={(value) => setDraft({ ...draft, icon: value })}
          />
          <Field
            label="Valor-meta"
            type="number"
            value={String(draft.targetAmount || "")}
            set={(value) => setDraft({ ...draft, targetAmount: Number(value) })}
          />
          <Field
            label="Aporte mensal"
            type="number"
            value={String(draft.monthlyContribution || "")}
            set={(value) =>
              setDraft({ ...draft, monthlyContribution: Number(value) })
            }
          />
          <Field
            label="Prazo"
            type="date"
            value={draft.deadline}
            set={(value) => setDraft({ ...draft, deadline: value })}
          />
          <div className="form-field full">
            <label>Descrição</label>
            <textarea
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
            />
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <Button variant="secondary" type="button" onClick={close}>
            Cancelar
          </Button>
          <Button variant="pink">Criar porquinho</Button>
        </div>
      </form>
    </Drawer>
  );
}
function PiggyMovementDrawer({
  piggy,
  hidden,
  close,
  move,
}: {
  piggy: PiggyBank | null;
  hidden: boolean;
  close: () => void;
  move: (id: string, amount: number, type: "DEPOSIT" | "WITHDRAWAL") => void;
}) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  if (!piggy) return null;
  const months =
    piggy.monthlyContribution > 0
      ? Math.ceil(
          Math.max(0, piggy.targetAmount - piggy.currentAmount) /
            piggy.monthlyContribution,
        )
      : null;
  return (
    <Drawer open onClose={close}>
      <h2>
        {piggy.icon} {piggy.name}
      </h2>
      <p>
        {months
          ? `Previsão: ${months} meses mantendo o aporte atual.`
          : "Sem previsão: informe um aporte mensal."}
      </p>
      <Card>
        <div className="piggy-amounts">
          <MoneyValue amount={piggy.currentAmount} hidden={hidden} />
          <span>de {formatCurrency(piggy.targetAmount, hidden)}</span>
        </div>
        <Progress
          value={percent(piggy.currentAmount, piggy.targetAmount)}
          color="#f472b6"
        />
      </Card>
      <div className="form-field" style={{ marginTop: 18 }}>
        <label>Tipo</label>
        <select
          value={type}
          onChange={(event) => setType(event.target.value as typeof type)}
        >
          <option value="DEPOSIT">Aporte</option>
          <option value="WITHDRAWAL">Retirada</option>
        </select>
      </div>
      <Field label="Valor" type="number" value={amount} set={setAmount} />
      <Button
        variant={type === "DEPOSIT" ? "pink" : "secondary"}
        onClick={() => {
          if (Number(amount) > 0) {
            move(piggy.id, Number(amount), type);
            setAmount("");
          }
        }}
      >
        {type === "DEPOSIT" ? "Registrar aporte" : "Registrar retirada"}
      </Button>
      <h3 className="drawer-subtitle">Histórico</h3>
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

export function EnhancedGroups({ state }: { state: State }) {
  const [groups, setGroups] = useState(state.groups);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [type, setType] = useState("TRIP");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = groupFormSchema.safeParse({
      name,
      type,
      targetAmount: Number(target || 0),
      eventDate: date,
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    const group: Group = {
      id: `g-${Date.now()}`,
      name,
      type: "OUTRO",
      description: "Novo planejamento compartilhado.",
      targetAmount: Number(target) || undefined,
      fund: 0,
      totalExpenses: 0,
      eventDate: date,
      emoji: "✨",
      color: "#f472b6",
      members: [
        { id: "u1", name: "João", initials: "JB", contribution: 0, balance: 0 },
      ],
      activity: ["Grupo criado por João"],
    };
    setGroups((items) => [group, ...items]);
    setOpen(false);
  };
  return (
    <>
      <PageHeader
        eyebrow="Planejamento coletivo"
        title="Grupos"
        description="Organize metas, despesas e acertos com quem importa."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Criar grupo
          </Button>
        }
      />
      <div className="group-grid">
        {groups.map((group) => (
          <Card className="group-card" key={group.id}>
            <div className="group-top">
              <div className="group-emoji">{group.emoji}</div>
              <div>
                <h2>{group.name}</h2>
                <p>
                  {group.type} · {formatShortDate(group.eventDate)}
                </p>
              </div>
            </div>
            <p>{group.description}</p>
            <div className="piggy-amounts">
              <MoneyValue amount={group.fund} hidden={state.hidden} />
              <span>
                {group.targetAmount
                  ? `de ${formatCurrency(group.targetAmount, state.hidden)}`
                  : "sem meta"}
              </span>
            </div>
            {group.targetAmount && (
              <Progress
                value={percent(group.fund, group.targetAmount)}
                color={group.color}
              />
            )}
            <div className="group-footer">
              <div className="avatar-group">
                {group.members.map((member) => (
                  <div className="avatar" key={member.id}>
                    {member.initials}
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                Abrir
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Drawer open={open} onClose={() => setOpen(false)}>
        <h2>Criar grupo</h2>
        <p>Convide participantes depois, ou comece com sua meta.</p>
        <form onSubmit={submit}>
          <Field label="Nome" value={name} set={setName} />
          <div className="form-field">
            <label>Tipo</label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="TRIP">Viagem</option>
              <option value="EVENT">Evento</option>
              <option value="HOUSE">Casa</option>
              <option value="GOAL">Meta</option>
              <option value="OTHER">Outro</option>
            </select>
          </div>
          <Field
            label="Meta (opcional)"
            type="number"
            value={target}
            set={setTarget}
          />
          <Field label="Data" type="date" value={date} set={setDate} />
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button>Criar grupo</Button>
          </div>
        </form>
      </Drawer>
    </>
  );
}

export function EnhancedGroupDetail({ state }: { state: State }) {
  const { id } = useParams();
  const source = state.groups.find((group) => group.id === id);
  const navigate = useNavigate();
  const [group, setGroup] = useState(source);
  const [tab, setTab] = useState("Visão geral");
  const [mode, setMode] = useState<"contribution" | "expense" | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [splitType, setSplitType] = useState("EQUAL");
  if (!group)
    return (
      <>
        <PageHeader
          title="Grupo não encontrado"
          description="Volte à lista e escolha outro planejamento."
        />
        <Button onClick={() => navigate("/groups")}>Voltar aos grupos</Button>
      </>
    );
  const settlements = makeSettlements(group.members);
  const addContribution = () => {
    const value = Number(amount);
    if (value <= 0) return;
    setGroup({
      ...group,
      fund: group.fund + value,
      members: group.members.map((member, index) =>
        index === 0
          ? {
              ...member,
              contribution: member.contribution + value,
              balance: member.balance + value,
            }
          : member,
      ),
      activity: [`João adicionou ${formatCurrency(value)}`, ...group.activity],
    });
    setMode(null);
    setAmount("");
  };
  const addExpense = () => {
    const value = Number(amount);
    if (value <= 0 || !description) return;
    const shares =
      splitType === "EQUAL"
        ? group.members.map(() => value / group.members.length)
        : group.members.map((_, index) =>
            index === 0
              ? value * 0.4
              : (value * 0.6) / (group.members.length - 1),
          );
    setGroup({
      ...group,
      totalExpenses: group.totalExpenses + value,
      fund: Math.max(0, group.fund - value),
      members: group.members.map((member, index) => ({
        ...member,
        balance: member.balance + (index === 0 ? value : 0) - shares[index],
      })),
      activity: [
        `João registrou ${description} por ${formatCurrency(value)}`,
        ...group.activity,
      ],
    });
    setMode(null);
    setAmount("");
    setDescription("");
  };
  return (
    <>
      <button className="button ghost" onClick={() => navigate("/groups")}>
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
        <Button onClick={() => setMode("expense")}>
          <Plus size={15} /> Registrar despesa
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
          <span>Meta</span>
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
        ].map((item) => (
          <button
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "Visão geral" && (
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
            <h3 className="drawer-subtitle">Atividade</h3>
            {group.activity.slice(0, 4).map((activity) => (
              <div className="bill-row" key={activity}>
                <span className="transaction-icon">•</span>
                <div className="bill-info">
                  <strong>{activity}</strong>
                  <small>Registrado agora</small>
                </div>
              </div>
            ))}
          </Card>
          <Card>
            <h2 style={{ fontSize: 14, marginTop: 0 }}>Progresso individual</h2>
            {group.members.map((member) => (
              <div className="bill-row" key={member.id}>
                <div className="avatar">{member.initials}</div>
                <div className="bill-info">
                  <strong>{member.name}</strong>
                  <Progress
                    value={percent(
                      member.contribution,
                      member.contribution || 1,
                    )}
                    color="#f472b6"
                  />
                </div>
                <MoneyValue
                  amount={member.contribution}
                  hidden={state.hidden}
                  size="small"
                />
              </div>
            ))}
          </Card>
        </div>
      )}
      {tab === "Contribuições" && (
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
          {group.members.map((member) => (
            <div className="bill-row" key={member.id}>
              <div className="avatar">{member.initials}</div>
              <div className="bill-info">
                <strong>{member.name}</strong>
                <small>Confirmada</small>
              </div>
              <MoneyValue
                amount={member.contribution}
                type="income"
                hidden={state.hidden}
              />
            </div>
          ))}
        </Card>
      )}
      {tab === "Despesas" && (
        <Card>
          <div className="section-heading">
            <div>
              <h2>Despesas compartilhadas</h2>
              <p>
                O pagador recebe crédito e cada participante assume sua parte.
              </p>
            </div>
            <Button onClick={() => setMode("expense")}>Nova despesa</Button>
          </div>
          {group.activity
            .filter((activity) => activity.includes("registrou"))
            .map((activity) => (
              <div className="bill-row" key={activity}>
                <span className="transaction-icon">◫</span>
                <div className="bill-info">
                  <strong>{activity}</strong>
                  <small>
                    Divisão {splitType === "EQUAL" ? "igual" : "personalizada"}
                  </small>
                </div>
              </div>
            ))}
        </Card>
      )}
      {tab === "Participantes" && (
        <Card>
          <div className="members-grid">
            {group.members.map((member) => (
              <div className="member-row" key={member.id}>
                <div className="avatar">{member.initials}</div>
                <span>{member.name}</span>
                <Badge tone="neutral">Membro</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
      {tab === "Acertos" && (
        <Card>
          <div className="section-heading">
            <div>
              <h2>Acerto inteligente</h2>
              <p>Sugestões com o menor número de transferências.</p>
            </div>
            <Badge tone="pink">{settlements.length} transferências</Badge>
          </div>
          {settlements.map((settlement) => (
            <div
              className="bill-row"
              key={`${settlement.from}-${settlement.to}`}
            >
              <div className="avatar">{settlement.from.slice(0, 2)}</div>
              <div className="bill-info">
                <strong>
                  {settlement.from} paga para {settlement.to}
                </strong>
                    <small>Sugestão do cofrin</small>
              </div>
              <MoneyValue amount={settlement.amount} hidden={state.hidden} />
              <Button
                variant="secondary"
                onClick={() =>
                  setGroup({
                    ...group,
                    members: group.members.map((member) =>
                      member.name === settlement.from
                        ? {
                            ...member,
                            balance: member.balance + settlement.amount,
                          }
                        : member.name === settlement.to
                          ? {
                              ...member,
                              balance: member.balance - settlement.amount,
                            }
                          : member,
                    ),
                  })
                }
              >
                Marcar pago
              </Button>
            </div>
          ))}
          {settlements.length === 0 && (
            <div className="empty">
              <strong>Todos quitados</strong>
              <p>Não há transferências pendentes.</p>
            </div>
          )}
        </Card>
      )}
      <Drawer open={mode !== null} onClose={() => setMode(null)}>
        <h2>
          {mode === "contribution"
            ? "Registrar contribuição"
            : "Registrar despesa"}
        </h2>
        <p>
          {mode === "contribution"
            ? "Este aporte aumenta o fundo coletivo."
            : "Registre quem pagou e como a despesa será dividida."}
        </p>
        {mode === "expense" && (
          <Field label="Descrição" value={description} set={setDescription} />
        )}
        <Field label="Valor" type="number" value={amount} set={setAmount} />
        {mode === "expense" && (
          <div className="form-field">
            <label>Tipo de divisão</label>
            <select
              value={splitType}
              onChange={(event) => setSplitType(event.target.value)}
            >
              <option value="EQUAL">Igual</option>
              <option value="PERCENTAGE">Percentual</option>
              <option value="SHARES">Por cotas</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>
        )}
        <Button
          onClick={mode === "contribution" ? addContribution : addExpense}
        >
          {mode === "contribution"
            ? "Confirmar contribuição"
            : "Salvar despesa"}
        </Button>
      </Drawer>
    </>
  );
}
function makeSettlements(members: Group["members"]) {
  const debtors = members
    .filter((member) => member.balance < -0.01)
    .map((member) => ({ name: member.name, amount: -member.balance }));
  const creditors = members
    .filter((member) => member.balance > 0.01)
    .map((member) => ({ name: member.name, amount: member.balance }));
  const results: { from: string; to: string; amount: number }[] = [];
  let debtor = 0,
    creditor = 0;
  while (debtor < debtors.length && creditor < creditors.length) {
    const amount = Math.min(debtors[debtor].amount, creditors[creditor].amount);
    results.push({
      from: debtors[debtor].name,
      to: creditors[creditor].name,
      amount: Number(amount.toFixed(2)),
    });
    debtors[debtor].amount -= amount;
    creditors[creditor].amount -= amount;
    if (debtors[debtor].amount < 0.01) debtor++;
    if (creditors[creditor].amount < 0.01) creditor++;
  }
  return results;
}

export function EnhancedCards({ state }: { state: State }) {
  const [cards, setCards] = useState([
    {
      id: "card-1",
      name: "Cartão principal",
      brand: "Mastercard",
      lastFour: "4582",
      limit: 5000,
      color: "#a78bfa",
    },
  ]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [limit, setLimit] = useState("");
  return (
    <>
      <PageHeader
        title="Meus cartões"
        description="Acompanhe limite, fechamento, fatura e parcelas."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Adicionar cartão
          </Button>
        }
      />
      <div className="piggy-grid">
        {cards.map((card) => {
          const invoice = card.id === "card-1" ? 1243.31 : 0;
          return (
            <Card className="balance-card" key={card.id}>
              <p className="eyebrow">{card.brand}</p>
              <h2>{card.name}</h2>
              <p style={{ fontSize: 20, letterSpacing: 3 }}>
                •••• {card.lastFour}
              </p>
              <div className="piggy-amounts">
                <span>Limite disponível</span>
                <MoneyValue
                  amount={card.limit - invoice}
                  hidden={state.hidden}
                />
              </div>
              <Progress
                value={percent(invoice, card.limit)}
                color={card.color}
              />
              <div className="balance-footer">
                <span>Limite {formatCurrency(card.limit, state.hidden)}</span>
                <span>Fecha dia 04</span>
                <span>Vence dia 11</span>
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Fatura atual</h2>
            <p>Pagamento de fatura é liquidação, nunca uma segunda despesa.</p>
          </div>
          <Badge tone="gold">Vence em 11 dias</Badge>
        </div>
        {state.transactions
          .filter((t) => t.account === "Cartão Nubank")
          .map((transaction) => (
            <div className="bill-row" key={transaction.id}>
              <span className="bill-date">
                {formatShortDate(transaction.date)}
              </span>
              <div className="bill-info">
                <strong>
                  {transaction.description}{" "}
                  {transaction.installment && `· ${transaction.installment}`}
                </strong>
                <small>{transaction.category}</small>
              </div>
              <MoneyValue
                amount={transaction.amount}
                type="expense"
                hidden={state.hidden}
              />
            </div>
          ))}
      </Card>
      <Drawer open={open} onClose={() => setOpen(false)}>
        <h2>Adicionar cartão</h2>
        <p>Este cartão ficará disponível nas suas próximas compras.</p>
        <Field label="Nome" value={name} set={setName} />
        <Field
          label="Últimos quatro dígitos"
          value={lastFour}
          set={setLastFour}
        />
        <Field label="Limite" type="number" value={limit} set={setLimit} />
        <Button
          onClick={() => {
            if (name && lastFour && Number(limit) > 0) {
              setCards((items) => [
                ...items,
                {
                  id: `card-${Date.now()}`,
                  name,
                  brand: "Visa",
                  lastFour,
                  limit: Number(limit),
                  color: "#38bdf8",
                },
              ]);
              setOpen(false);
            }
          }}
        >
          Salvar cartão
        </Button>
      </Drawer>
    </>
  );
}

export function EnhancedBudgets({ hidden }: { hidden: boolean }) {
  const [items, setItems] = useState<Budget[]>(seededBudgets);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [error, setError] = useState("");
  return (
    <>
      <PageHeader
        title="Orçamentos"
        description="Crie limites mensais e acompanhe cada categoria."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Novo orçamento
          </Button>
        }
      />
      <div className="budget-grid">
        {items.map((item) => {
          const status = budgetStatus(item.spent, item.limit);
          const tone =
            status === "ultrapassado"
              ? "red"
              : status === "em alerta"
                ? "gold"
                : "green";
          return (
            <Card className="budget-card" key={item.id}>
              <h2>{item.category}</h2>
              <div className="budget-values">
                <MoneyValue amount={item.spent} hidden={hidden} />
                <span>de {formatCurrency(item.limit, hidden)}</span>
              </div>
              <Progress
                value={percent(item.spent, item.limit)}
                color={
                  tone === "red"
                    ? "#ef4444"
                    : tone === "gold"
                      ? "#f5c451"
                      : item.color
                }
              />
              <small>
                {formatCurrency(Math.abs(item.limit - item.spent), hidden)}{" "}
                {item.spent > item.limit ? "acima do limite" : "restante"}
              </small>
              <div style={{ marginTop: 14 }}>
                <Badge tone={tone}>{status}</Badge>
              </div>
            </Card>
          );
        })}
      </div>
      <Drawer open={open} onClose={() => setOpen(false)}>
        <h2>Novo orçamento</h2>
        <p>Você receberá alertas ao se aproximar do limite.</p>
        <Field label="Categoria" value={category} set={setCategory} />
        <Field
          label="Limite mensal"
          type="number"
          value={limit}
          set={setLimit}
        />
        {error && <p className="form-error">{error}</p>}
        <Button
          onClick={() => {
            const result = budgetFormSchema.safeParse({
              category,
              limit: Number(limit),
            });
            if (!result.success) {
              setError(result.error.issues[0].message);
              return;
            }
            setItems((values) => [
              ...values,
              {
                id: `b-${Date.now()}`,
                category,
                limit: Number(limit),
                spent: 0,
                color: "#4ade80",
              },
            ]);
            setOpen(false);
          }}
        >
          Salvar orçamento
        </Button>
      </Drawer>
    </>
  );
}

export function EnhancedCalendar() {
  const [selected, setSelected] = useState<number | null>(null);
  const events: Record<number, { name: string; amount: number }[]> = {
    3: [
      { name: "Internet", amount: 119.9 },
      { name: "Parcela Notebook", amount: 399.9 },
    ],
    5: [{ name: "Netflix", amount: 55.9 }],
    8: [{ name: "Fatura Nubank", amount: 1243.31 }],
    12: [{ name: "Energia", amount: 186.4 }],
    20: [{ name: "Churrasco da turma", amount: 0 }],
  };
  const days = Array.from({ length: 35 }, (_, index) => index - 4);
  return (
    <>
      <PageHeader
        title="Calendário"
        description="Contas, faturas, receitas, parcelas e eventos em uma visão mensal."
        action={
          <Button variant="secondary">
            <CalendarDays size={15} /> Agosto 2026
          </Button>
        }
      />
      <Card>
        <div className="calendar-grid">
          {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((day) => (
            <div className="calendar-label" key={day}>
              {day}
            </div>
          ))}
          {days.map((day, index) => (
            <button
              className={`calendar-day ${day === 31 ? "today" : ""}`}
              key={index}
              onClick={() => events[day] && setSelected(day)}
            >
              {day > 0 && day <= 31 ? day : ""}
              {events[day]?.map((event) => (
                <i className="calendar-event" key={event.name}>
                  {event.name}
                </i>
              ))}
            </button>
          ))}
        </div>
      </Card>
      <Drawer open={selected !== null} onClose={() => setSelected(null)}>
        <h2>{selected && String(selected).padStart(2, "0")}/09/2026</h2>
        <p>Compromissos financeiros desta data.</p>
        {selected &&
          events[selected].map((event) => (
            <div className="bill-row" key={event.name}>
              <span className="transaction-icon">
                <WalletCards size={15} />
              </span>
              <div className="bill-info">
                <strong>{event.name}</strong>
                <small>Pendente</small>
              </div>
              {event.amount > 0 && (
                <MoneyValue amount={event.amount} size="small" />
              )}
            </div>
          ))}
      </Drawer>
    </>
  );
}

export function EnhancedSettings({
  hidden,
  setHidden,
}: {
  hidden: boolean;
  setHidden: (value: boolean) => void;
}) {
  const [tab, setTab] = useState("Perfil");
  const [saved, setSaved] = useState(false);
  const tabs = [
    "Perfil",
    "Contas",
    "Categorias",
    "Preferências",
    "Notificações",
    "Segurança",
  ];
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Controle seu perfil e suas preferências."
      />
      <div className="settings-tabs">
        {tabs.map((item) => (
          <button
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>
      <Card className="settings-list">
        {tab === "Perfil" ? (
          <>
            <Field label="Nome" value="João Braga" set={() => undefined} />
            <Field
              label="E-mail"
              value="joao@cofrin.app"
              set={() => undefined}
            />
            <Field label="Moeda" value="BRL" set={() => undefined} />
            <Field label="Idioma" value="pt-BR" set={() => undefined} />
            <Button onClick={() => setSaved(true)}>
              {saved ? (
                <>
                  <Check size={15} /> Salvo
                </>
              ) : (
                "Salvar perfil"
              )}
            </Button>
          </>
        ) : tab === "Preferências" ? (
          <div className="setting">
            <div>
              <strong>Privacidade visual</strong>
              <p>Ocultar valores em todos os módulos.</p>
            </div>
            <button
              className={`toggle ${hidden ? "on" : ""}`}
              onClick={() => setHidden(!hidden)}
            >
              <i />
            </button>
          </div>
        ) : tab === "Contas" ? (
          <div className="metric-list">
            <div>
              <span>Conta principal</span>
              <MoneyValue amount={6820.35} hidden={hidden} />
            </div>
            <div>
              <span>Carteira</span>
              <MoneyValue amount={600} hidden={hidden} />
            </div>
            <div>
              <span>Reserva</span>
              <MoneyValue amount={1000} hidden={hidden} />
            </div>
          </div>
        ) : (
          <div className="empty">
            <Users size={30} />
            <strong>{tab}</strong>
            <p>Configurações mockadas para a demonstração.</p>
          </div>
        )}
      </Card>
    </>
  );
}

export function EnhancedTransactions({ state }: { state: State }) {
  const [items, setItems] = useState(state.transactions);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const shown = useMemo(
    () =>
      items.filter(
        (item) =>
          (type === "ALL" || item.type === type) &&
          `${item.description} ${item.category} ${item.account}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [items, search, type],
  );
  const income = items
    .filter((item) => item.type === "INCOME")
    .reduce((total, item) => total + item.amount, 0);
  const expense = items
    .filter((item) => item.type === "EXPENSE")
    .reduce((total, item) => total + item.amount, 0);
  const save = (draft: Transaction) => {
    const result = transactionFormSchema.safeParse({
      description: draft.description,
      amount: draft.amount,
      date: draft.date,
      category: draft.category,
      type: draft.type,
    });
    if (!result.success) return result.error.issues[0].message;
    setItems((values) =>
      editing
        ? values.map((item) => (item.id === draft.id ? draft : item))
        : [draft, ...values],
    );
    setOpen(false);
    setEditing(null);
    return null;
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
            <Plus size={16} /> Novo lançamento
          </Button>
        }
      />
      <div className="summary-strip">
        <div>
          <span>Entradas</span>
          <MoneyValue amount={income} type="income" hidden={state.hidden} />
        </div>
        <div>
          <span>Saídas</span>
          <MoneyValue amount={expense} type="expense" hidden={state.hidden} />
        </div>
        <div>
          <span>Saldo</span>
          <MoneyValue amount={income - expense} hidden={state.hidden} />
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
            onChange={(event) => setType(event.target.value)}
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
            }}
          >
            Limpar filtros
          </Button>
        </div>
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
                    {item.installment && <small> · {item.installment}</small>}
                  </td>
                  <td>{item.category}</td>
                  <td>{formatDate(item.date)}</td>
                  <td>{item.account}</td>
                  <td>
                    <Badge
                      tone={
                        item.status === "PENDING"
                          ? "gold"
                          : item.status === "OVERDUE"
                            ? "red"
                            : "green"
                      }
                    >
                      {item.status === "PENDING"
                        ? "Pendente"
                        : item.status === "OVERDUE"
                          ? "Atrasado"
                          : "Confirmado"}
                    </Badge>
                  </td>
                  <td>
                    <MoneyValue
                      amount={item.amount}
                      type={item.type === "INCOME" ? "income" : "expense"}
                      hidden={state.hidden}
                    />
                  </td>
                  <td>
                    <Button
                      variant="ghost"
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
                            setItems((values) => [
                              {
                                ...item,
                                id: `t-${Date.now()}`,
                                description: `${item.description} (cópia)`,
                              },
                              ...values,
                            ]);
                            setActionId(null);
                          }}
                        >
                          Duplicar
                        </button>
                        {item.status === "PENDING" && (
                          <button
                            onClick={() => {
                              setItems((values) =>
                                values.map((value) =>
                                  value.id === item.id
                                    ? {
                                        ...value,
                                        status:
                                          item.type === "INCOME"
                                            ? "RECEIVED"
                                            : "PAID",
                                      }
                                    : value,
                                ),
                              );
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
      </Card>
      <TransactionFormDrawer
        open={open}
        close={() => {
          setOpen(false);
          setEditing(null);
        }}
        initial={editing}
        save={save}
      />
      {confirmId && (
        <Drawer open onClose={() => setConfirmId(null)}>
          <h2>Excluir lançamento?</h2>
          <p>Essa ação remove o lançamento da demonstração.</p>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setConfirmId(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setItems((values) =>
                  values.filter((item) => item.id !== confirmId),
                );
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
export function EnhancedReports({ state }: { state: State }) {
  const income = state.transactions
    .filter((item) => item.type === "INCOME")
    .reduce((total, item) => total + item.amount, 0);
  const expense = state.transactions
    .filter((item) => item.type === "EXPENSE")
    .reduce((total, item) => total + item.amount, 0);
  const categories = state.transactions
    .filter((item) => item.type === "EXPENSE")
    .reduce<Record<string, number>>(
      (all, item) => ({
        ...all,
        [item.category]: (all[item.category] ?? 0) + item.amount,
      }),
      {},
    );
  const chart = [
    { month: "Mar", income: 6200, expense: 3870 },
    { month: "Abr", income: 6500, expense: 4240 },
    { month: "Mai", income: 6800, expense: 3900 },
    { month: "Jun", income: 7100, expense: 4610 },
    { month: "Jul", income: 7200, expense: 4380 },
    { month: "Ago", income, expense },
  ];
  const categoryData = Object.entries(categories)
    .slice(0, 6)
    .map(([name, value], index) => ({
      name,
      value,
      color: ["#f5c451", "#f472b6", "#4ade80", "#a78bfa", "#38bdf8", "#71717a"][
        index
      ],
    }));
  const download = () => {
    const csv = [
      "Data,Descrição,Tipo,Categoria,Conta,Status,Valor",
      ...state.transactions.map(
        (item) =>
          `${item.date},${item.description},${item.type},${item.category},${item.account},${item.status},${item.amount}`,
      ),
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "cofrin-relatorio.csv";
    link.click();
  };
  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Resumo, fluxo, categorias, evolução e metas."
        action={
          <Button variant="secondary" onClick={download}>
            Exportar CSV
          </Button>
        }
      />
      <div className="stats">
        <Card>
          <span>Receita total</span>
          <MoneyValue amount={income} type="income" hidden={state.hidden} />
        </Card>
        <Card>
          <span>Despesa total</span>
          <MoneyValue amount={expense} type="expense" hidden={state.hidden} />
        </Card>
        <Card>
          <span>Saldo</span>
          <MoneyValue amount={income - expense} hidden={state.hidden} />
        </Card>
        <Card>
          <span>Taxa de economia</span>
          <strong>
            {income ? (((income - expense) / income) * 100).toFixed(1) : 0}%
          </strong>
        </Card>
        <Card>
          <span>Média diária</span>
          <MoneyValue amount={expense / 31} hidden={state.hidden} />
        </Card>
        <Card>
          <span>Maior categoria</span>
          <strong>
            {categoryData.sort((a, b) => b.value - a.value)[0]?.name ?? "—"}
          </strong>
        </Card>
      </div>
      <div className="report-grid dashboard-section">
        <Card className="chart-card">
          <div className="section-heading">
            <div>
              <h2>Fluxo e evolução</h2>
              <p>Receitas, despesas e saldo acumulado.</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="82%">
            <AreaChart data={chart}>
              <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 10 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
              <Tooltip
                formatter={(value: number) =>
                  formatCurrency(value, state.hidden)
                }
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#4ade80"
                fill="#22c55e33"
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="#f472b6"
                fill="#f472b622"
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
                  data={categoryData}
                  dataKey="value"
                  innerRadius={50}
                  outerRadius={70}
                >
                  {categoryData.map((category) => (
                    <Cell fill={category.color} key={category.name} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) =>
                    formatCurrency(value, state.hidden)
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {categoryData.map((category) => (
            <div className="category-row" key={category.name}>
              <i className="dot" style={{ background: category.color }} />
              <span>{category.name}</span>
              <MoneyValue
                amount={category.value}
                hidden={state.hidden}
                size="small"
              />
            </div>
          ))}
        </Card>
      </div>
      <Card className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Saúde financeira: 76/100</h2>
            <p>
              Boa — índice educacional, não é recomendação financeira
              profissional.
            </p>
          </div>
          <Badge tone="green">Boa</Badge>
        </div>
        <div className="stats">
          <div>
            <strong>Capacidade de poupança</strong>
            <p>Taxa acima de 20%.</p>
          </div>
          <div>
            <strong>Contas atrasadas</strong>
            <p>Nenhuma pendência atrasada.</p>
          </div>
          <div>
            <strong>Orçamentos</strong>
            <p>Um orçamento precisa de atenção.</p>
          </div>
          <div>
            <strong>Metas</strong>
            <p>Três objetivos em andamento.</p>
          </div>
        </div>
      </Card>
    </>
  );
}
function TransactionFormDrawer({
  open,
  close,
  initial,
  save,
}: {
  open: boolean;
  close: () => void;
  initial: Transaction | null;
  save: (item: Transaction) => string | null;
}) {
  const [draft, setDraft] = useState<Transaction | null>(null);
  const active = draft ??
    initial ?? {
      id: `t-${Date.now()}`,
      description: "",
      amount: 0,
      type: "EXPENSE" as const,
      nature: "PERSONAL" as const,
      date: new Date().toISOString().slice(0, 10),
      category: "Outros",
      account: "Conta principal",
      status: "PAID" as const,
      paymentMethod: "PIX",
    };
  const [error, setError] = useState("");
  if (!open) return null;
  const update = (patch: Partial<Transaction>) =>
    setDraft({ ...active, ...patch });
  return (
    <Drawer open onClose={close}>
      <h2>{initial ? "Editar lançamento" : "Novo lançamento"}</h2>
      <p>O tipo define se o valor é entrada, saída ou transferência.</p>
      <div className="form-field">
        <label>Tipo</label>
        <select
          value={active.type}
          onChange={(event) =>
            update({ type: event.target.value as Transaction["type"] })
          }
        >
          <option value="EXPENSE">Despesa</option>
          <option value="INCOME">Receita</option>
          <option value="TRANSFER">Transferência</option>
        </select>
      </div>
      <Field
        label="Descrição"
        value={active.description}
        set={(value) => update({ description: value })}
      />
      <Field
        label="Valor"
        type="number"
        value={String(active.amount || "")}
        set={(value) => update({ amount: Number(value) })}
      />
      <Field
        label="Data"
        type="date"
        value={active.date}
        set={(value) => update({ date: value })}
      />
      <Field
        label="Categoria"
        value={active.category}
        set={(value) => update({ category: value })}
      />
      <div className="form-field">
        <label>Conta</label>
        <select
          value={active.account}
          onChange={(event) => update({ account: event.target.value })}
        >
          <option>Conta principal</option>
          <option>Cartão Nubank</option>
          <option>Carteira</option>
        </select>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <Button variant="secondary" onClick={close}>
          Cancelar
        </Button>
        <Button
          onClick={() => {
            const result = save(active);
            if (result) setError(result);
          }}
        >
          {initial ? "Salvar alterações" : "Criar lançamento"}
        </Button>
      </div>
    </Drawer>
  );
}

function Field({
  label,
  value,
  set,
  type = "text",
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => set(event.target.value)}
      />
    </div>
  );
}
