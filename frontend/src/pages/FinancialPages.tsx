import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Check, Download, KeyRound, LogOut, MonitorSmartphone, Plus, Target, WalletCards } from "lucide-react";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Badge, Button, Card, ChoiceCard, CurrencyInput, Drawer, DrawerFooter, DrawerHeader, EmptyState, FormHint, FormSection, MoneyValue, PageHeader, Progress } from "../components/ui";
import { useAppData } from "../providers/AppDataProvider";
import { useAuth } from "../providers/AuthProvider";
import { ApiError } from "../services/api";
import { budgetFormSchema } from "../services/schemas";
import type { AuthSession, Transaction } from "../types";
import { budgetStatus, formatCurrency, formatDate, formatShortDate, percent } from "../utils/format";
import { accountName, budgetSpent, cardInvoiceSummary, categoryName, spendingByCategory, transactionTotals } from "../utils/selectors";

const today = () => new Date().toISOString().slice(0, 10);
const cardColorClass = (color?: string) => ["carbon", "graphite", "green", "gold", "wine"].includes(color ?? "") ? color! : "carbon";

export function EnhancedCards() {
  const { cards, transactions, accounts, hidden, createCard, payInvoice, pending } = useAppData();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [invoiceReference, setInvoiceReference] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [paymentError, setPaymentError] = useState("");
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
  const summaryFor = (card: (typeof cards)[number]) => cardInvoiceSummary(card, transactions);
  const selectedSummary = selected ? summaryFor(selected) : undefined;
  const selectedInvoice = selectedSummary?.invoices.find((invoice) => invoice.referenceMonth === invoiceReference)
    ?? selectedSummary?.currentInvoice
    ?? selectedSummary?.invoices.at(-1);
  const paymentAccount = accounts.find((account) => account.id === paymentAccountId);
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
            const invoice = summaryFor(card);
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
                    amount={invoice.availableLimit}
                    hidden={hidden}
                  />
                </div>
                <Progress
                  value={percent(invoice.usedLimit, card.limit)}
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
                <span>{selectedInvoice ? `Fatura ${new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(new Date(`${selectedInvoice.referenceMonth}-01T12:00:00`))}` : "Fatura atual"}</span>
                <MoneyValue amount={selectedInvoice?.remainingAmount ?? 0} hidden={hidden} />
              </div>
              <div>
                <span>Limite disponível</span>
                <MoneyValue amount={selectedSummary?.availableLimit ?? selected.limit} hidden={hidden} />
              </div>
              <div>
                <span>Vencimento</span>
                <strong>{selectedInvoice ? formatDate(selectedInvoice.dueDate) : `Dia ${selected.dueDay}`}</strong>
              </div>
            </div>
            {selectedSummary && selectedSummary.invoices.length > 1 && <div className="invoice-cycle-list" aria-label="Escolher fatura">{selectedSummary.invoices.map((invoice) => <button key={invoice.referenceMonth} className={selectedInvoice?.referenceMonth === invoice.referenceMonth ? "active" : ""} onClick={() => setInvoiceReference(invoice.referenceMonth)}><span>{new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(new Date(`${invoice.referenceMonth}-01T12:00:00`))}</span><small>{invoice.status === "PAID" ? "Paga" : invoice.status === "OVERDUE" ? "Atrasada" : invoice.status === "CLOSED" ? "Fechada" : "Aberta"}</small></button>)}</div>}
            {selectedInvoice && selectedInvoice.remainingAmount > 0 && <div className="invoice-payment-action"><div><strong>{selectedInvoice.status === "OVERDUE" ? "Fatura atrasada" : selectedInvoice.status === "CLOSED" ? "Fatura fechada" : "Fatura aberta"}</strong><small>{selectedInvoice.paidAmount > 0 ? `${formatCurrency(selectedInvoice.paidAmount, hidden)} já pagos` : `Fecha em ${formatDate(selectedInvoice.closingDate)}`}</small></div><Button onClick={() => { setPaymentAccountId(""); setPaymentError(""); setPaymentOpen(true); }}>Pagar fatura</Button></div>}
            {selectedInvoice?.items.map((item) => (
                <div className="bill-row" key={item.id}>
                  <span className="bill-date">
                    {formatShortDate(item.date)}
                  </span>
                  <div className="bill-info">
                    <strong>{item.description}</strong>
                    <small>{categoryName(item.categoryId)}</small>
                    {item.installmentNumber && <small>Parcela {item.installmentNumber}/{item.installmentCount}</small>}
                  </div>
                  <MoneyValue
                    amount={item.amount}
                    type="expense"
                    hidden={hidden}
                  />
                </div>
              ))}
            {!selectedInvoice?.items.length && (
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
      <Drawer open={paymentOpen} onClose={() => setPaymentOpen(false)}>
        <DrawerHeader eyebrow="Liquidação" title="Pagar fatura" description={selectedInvoice ? `A transferência será vinculada à fatura de ${selectedInvoice.referenceMonth} e não será contada como uma nova despesa.` : "Escolha uma conta para pagar."} />
        <FormSection title="Conta de origem">
          {accounts.map((account) => <button type="button" key={account.id} className={`transfer-account ${paymentAccountId === account.id ? "selected" : ""}`} onClick={() => { setPaymentAccountId(account.id); setPaymentError(""); }}><span><strong>{account.name}</strong><small>Disponível: {formatCurrency(account.balance, hidden)}</small></span><Check size={16} /></button>)}
        </FormSection>
        {selectedInvoice && <div className="live-summary"><span>Valor pendente</span><strong>{formatCurrency(selectedInvoice.remainingAmount, hidden)}</strong>{paymentAccount && paymentAccount.balance < selectedInvoice.remainingAmount && <p className="form-error">Saldo insuficiente nesta conta.</p>}</div>}
        {paymentError && <p className="form-error" role="alert">{paymentError}</p>}
        <DrawerFooter onCancel={() => setPaymentOpen(false)} submitLabel="Pagar fatura" loading={pending.payInvoice} disabled={!selectedInvoice || !paymentAccount || paymentAccount.balance < selectedInvoice.remainingAmount} onSubmit={async () => {
          if (!selected || !selectedInvoice || !paymentAccount) return;
          try { await payInvoice(selected.id, selectedInvoice.referenceMonth, paymentAccount.id, selectedInvoice.remainingAmount); setPaymentOpen(false); }
          catch (cause) { setPaymentError(cause instanceof Error ? cause.message : "Não foi possível pagar a fatura."); }
        }} />
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
  const { changePassword, listSessions, revokeOtherSessions, logout } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [saved, setSaved] = useState(false);
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [sessionError, setSessionError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityMessage, setSecurityMessage] = useState("");
  const [securityError, setSecurityError] = useState("");
  const [securityLoading, setSecurityLoading] = useState(false);
  const tab = params.get("tab") === "security" ? "security" : "preferences";
  useEffect(() => { if (tab !== "security") return; void listSessions().then(setSessions).catch(() => setSessionError("Não foi possível carregar suas sessões.")); }, [tab, listSessions]);
  const switchTab = (next: "preferences" | "security") => { const nextParams = new URLSearchParams(params); if (next === "security") nextParams.set("tab", "security"); else nextParams.delete("tab"); setParams(nextParams); };
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Controle suas preferências no cofrin."
      />
      <div className="settings-tabs" role="tablist"><button className={tab === "preferences" ? "active" : ""} onClick={() => switchTab("preferences")}>Preferências</button><button className={tab === "security" ? "active" : ""} onClick={() => switchTab("security")}>Segurança</button></div>
      {tab === "preferences" ? <Card className="settings-list">
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
      </Card> : <div className="settings-security-grid"><Card className="settings-security-card"><div className="section-heading"><div><h2><KeyRound size={17} /> Alterar senha</h2><p>Confirme sua senha atual. As demais sessões serão encerradas.</p></div></div><form onSubmit={async (event) => { event.preventDefault(); if (securityLoading) return; setSecurityError(""); setSecurityMessage(""); if (newPassword !== confirmPassword) { setSecurityError("As novas senhas não coincidem."); return; } setSecurityLoading(true); try { await changePassword(currentPassword, newPassword); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setSecurityMessage("Senha alterada e sessão renovada."); setSessions(await listSessions()); } catch (cause) { setSecurityError(cause instanceof ApiError ? cause.message : "Não foi possível alterar sua senha."); } finally { setSecurityLoading(false); } }}><div className="form-field"><label>Senha atual</label><input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} maxLength={128} required /></div><div className="form-field"><label>Nova senha</label><input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={10} maxLength={128} required /><small>Use de 10 a 128 caracteres.</small></div><div className="form-field"><label>Confirmar nova senha</label><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={10} maxLength={128} required /></div>{securityError && <p className="form-error">{securityError}</p>}{securityMessage && <p className="form-success">{securityMessage}</p>}<Button type="submit" loading={securityLoading} disabled={securityLoading}>Salvar nova senha</Button></form></Card><Card className="settings-security-card"><div className="section-heading"><div><h2><MonitorSmartphone size={17} /> Sessões</h2><p>Dispositivos com acesso ativo à sua conta.</p></div></div>{sessionError ? <p className="form-error">{sessionError}</p> : <div className="session-list">{sessions.map((session) => <div className="session-row" key={session.id}><div><strong>{session.current ? "Este dispositivo" : "Outro dispositivo"}</strong><small>{session.userAgent ?? "Navegador não identificado"}</small><small>Visto em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(session.lastSeenAt))}</small></div>{session.current && <Badge tone="green">Atual</Badge>}</div>)}</div>}<div className="security-actions"><Button variant="secondary" disabled={!sessions.some((session) => !session.current)} onClick={async () => { setSecurityLoading(true); try { await revokeOtherSessions(); setSessions(await listSessions()); setSecurityMessage("Outras sessões encerradas."); } finally { setSecurityLoading(false); } }}>Encerrar outras sessões</Button><Button variant="danger" onClick={async () => { await logout(); navigate("/login", { replace: true }); }}><LogOut size={15} />Sair do Cofrin</Button></div></Card></div>}
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
