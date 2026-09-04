import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowLeftRight, ArrowRight, ArrowUpRight, CalendarClock, ChevronLeft, ChevronRight, CircleDollarSign, Plus, Wallet } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { Button, Card, EmptyState, MoneyValue, PageHeader, Progress } from "../components/ui";
import { dashboardEntrance, motionTokens } from "../components/motion";
import { useAppData } from "../providers/AppDataProvider";
import { formatCurrency, formatDate, formatShortDate, percent } from "../utils/format";
import { accountName, budgetSpent, categoryName, expenseObligations, groupFundValue, groupLabel, personalLedgerTransactions, piggyTotal, spendingByCategory } from "../utils/selectors";

const categoryColors = ["#4ade80", "#f5c451", "#e87878", "#8d8d94"];
const formatMonth = (value: string) => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${value}-01T12:00:00`));

function DashboardSection({ children, index, className = "" }: { children: ReactNode; index: number; className?: string }) {
  return <motion.section className={`dashboard-section ${className}`} initial={dashboardEntrance.initial} animate={dashboardEntrance.animate} transition={{ ...dashboardEntrance.transition, delay: index * 0.035 }}>{children}</motion.section>;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { transactions, piggies, groups, budgets, accounts, hidden } = useAppData();
  const latestMonth = [...transactions].sort((a, b) => b.date.localeCompare(a.date))[0]?.date.slice(0, 7) ?? new Date().toISOString().slice(0, 7);
  const [referenceMonth, setReferenceMonth] = useState(latestMonth);
  const monthTransactions = personalLedgerTransactions(transactions).filter((item) => item.date.startsWith(referenceMonth));
  const income = monthTransactions.filter((item) => item.type === "INCOME").reduce((total, item) => total + item.amount, 0);
  const expenses = monthTransactions.filter((item) => item.type === "EXPENSE").reduce((total, item) => total + item.amount, 0);
  const obligations = expenseObligations(monthTransactions);
  const committed = obligations.reduce((total, item) => total + item.amount, 0);
  const availableBalance = accounts.reduce((total, account) => total + account.balance, 0);
  const upcoming = [...obligations].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const allCategories = spendingByCategory(monthTransactions).sort((a, b) => b.amount - a.amount);
  const totalCategorySpend = allCategories.reduce((total, item) => total + item.amount, 0);
  const categories = allCategories.length > 4
    ? [...allCategories.slice(0, 3), { categoryId: "__other__", name: "Outros", amount: allCategories.slice(3).reduce((total, item) => total + item.amount, 0) }]
    : allCategories.slice(0, 4);
  const budgetItems = budgets.filter((budget) => budget.referenceMonth === referenceMonth).map((budget) => ({ ...budget, currentAmount: budgetSpent(budget, transactions) })).sort((a, b) => b.currentAmount / b.limitAmount - a.currentAmount / a.limitAmount).slice(0, 3);
  const flow = Object.entries(monthTransactions.reduce<Record<string, { income: number; expense: number }>>((all, item) => {
    const value = all[item.date] ?? { income: 0, expense: 0 };
    if (item.type === "INCOME") value.income += item.amount;
    if (item.type === "EXPENSE") value.expense += item.amount;
    all[item.date] = value;
    return all;
  }, {})).sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({ day: date.slice(8), ...values }));
  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const setMonthOffset = (offset: number) => {
    const date = new Date(`${referenceMonth}-01T12:00:00`);
    date.setMonth(date.getMonth() + offset);
    setReferenceMonth(date.toISOString().slice(0, 7));
  };

  return <div className="dashboard-page">
    <PageHeader eyebrow="Visão financeira" title="Visão geral" description="Acompanhe suas decisões do mês em um só lugar." action={<Button onClick={() => navigate("/transactions?new=1")}><Plus size={16} />Novo lançamento</Button>} />
    <div className="period-control" aria-label="Período de referência">
      <button aria-label="Mês anterior" onClick={() => setMonthOffset(-1)}><ChevronLeft size={15} /></button>
      <AnimatePresence initial={false} mode="wait"><motion.strong key={referenceMonth} initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -2 }} transition={{ duration: motionTokens.fast, ease: motionTokens.ease }}>{formatMonth(referenceMonth)}</motion.strong></AnimatePresence>
      <button aria-label="Próximo mês" onClick={() => setMonthOffset(1)}><ChevronRight size={15} /></button>
    </div>

    <DashboardSection index={0} className="dashboard-financial">
      <Card className="balance-card dashboard-balance"><div className="balance-kicker"><Wallet size={16} /><span>Saldo disponível</span></div><MoneyValue amount={availableBalance} hidden={hidden} size="large" /><div className="balance-footer"><span>{accounts.length} conta{accounts.length === 1 ? "" : "s"} disponível{accounts.length === 1 ? "" : "is"}</span><span>Saldo transacional atual</span></div></Card>
      <div className="financial-stats">
        <Card className="stat-card"><div className="stat-label"><span>Receitas</span><ArrowUpRight size={15} /></div><MoneyValue amount={income} type="income" hidden={hidden} /><small>{monthTransactions.filter((item) => item.type === "INCOME").length} entrada(s) no período</small></Card>
        <Card className="stat-card"><div className="stat-label"><span>Despesas</span><ArrowDownRight size={15} /></div><MoneyValue amount={expenses} type="expense" hidden={hidden} /><small>{monthTransactions.filter((item) => item.type === "EXPENSE").length} saída(s) no período</small></Card>
        <Card className="stat-card committed-card"><div className="stat-label"><span>Comprometido</span><CalendarClock size={15} /></div><MoneyValue amount={committed} hidden={hidden} /><small>Contas pendentes ou atrasadas neste mês.</small></Card>
      </div>
    </DashboardSection>

    <DashboardSection index={1}>
      <div className="section-heading"><div><h2>Fluxo financeiro</h2><p>Receitas e despesas ao longo de {formatMonth(referenceMonth)}.</p></div></div>
      <div className="dashboard-flow">
        <Card className="flow-card">{flow.length ? <ResponsiveContainer width="100%" height={276}><BarChart data={flow} barGap={5}><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#8d8d94", fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#8d8d94", fontSize: 10 }} width={40} /><Tooltip cursor={{ fill: "#202023" }} contentStyle={{ background: "#171719", border: "1px solid #39393e", borderRadius: 10 }} formatter={(value: number) => formatCurrency(value, hidden)} /><Bar dataKey="income" name="Receitas" fill="#4ade80" radius={[4, 4, 0, 0]} /><Bar dataKey="expense" name="Despesas" fill="#e87878" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState title="Sem movimentações neste período" detail="O fluxo aparece quando houver lançamentos." />}</Card>
        <Card className="category-card"><div className="section-heading"><div><h2>Gastos por categoria</h2><p>Distribuição das despesas do período.</p></div></div>{categories.length ? <><div className="category-donut"><ResponsiveContainer><PieChart><Pie data={categories} dataKey="amount" innerRadius={47} outerRadius={66} stroke="none">{categories.map((item, index) => <Cell key={item.categoryId} fill={categoryColors[index]} />)}</Pie><Tooltip contentStyle={{ background: "#171719", border: "1px solid #39393e", borderRadius: 10 }} formatter={(value: number) => formatCurrency(value, hidden)} /></PieChart></ResponsiveContainer></div><div className="category-list">{categories.map((item, index) => <div className="category-row" key={item.categoryId}><i className="dot" style={{ background: categoryColors[index] }} /><span>{item.name}</span><small>{percent(item.amount, totalCategorySpend)}%</small><MoneyValue amount={item.amount} hidden={hidden} size="small" /></div>)}</div></> : <EmptyState title="Sem gastos neste período" detail="As despesas aparecerão aqui." />}</Card>
      </div>
    </DashboardSection>

    <DashboardSection index={2} className="dashboard-duo">
      <Card><div className="section-heading"><div><h2>Próximos compromissos</h2><p>Contas previstas para o período selecionado.</p></div><Button variant="ghost" onClick={() => navigate("/calendar")}>Calendário</Button></div>{upcoming.length ? upcoming.map((item) => <button className="bill-row dashboard-bill-row" key={item.id} onClick={() => navigate(`/transactions?q=${encodeURIComponent(item.description)}`)}><span className={`bill-date ${item.status === "OVERDUE" ? "overdue" : ""}`}>{formatShortDate(item.date)}</span><span className="bill-info"><strong>{item.description}</strong><small>{accountName(item.accountId)} · {item.status === "OVERDUE" ? "Atrasado" : "Pendente"}</small></span><MoneyValue amount={item.amount} hidden={hidden} size="small" /></button>) : <EmptyState title="Nenhum compromisso neste período" detail="Contas pendentes aparecem aqui." />}</Card>
      <Card><div className="section-heading"><div><h2>Orçamentos</h2><p>Limites mais próximos.</p></div><Button variant="ghost" onClick={() => navigate("/budgets")}>Ver todos</Button></div>{budgetItems.length ? budgetItems.map((item) => { const usage = percent(item.currentAmount, item.limitAmount); const color = usage >= 100 ? "#ef4444" : usage >= 80 ? "#f5c451" : "#4ade80"; const status = usage >= 100 ? "Excedido" : usage >= 80 ? "Atenção" : "Seguro"; return <button className="dashboard-budget-row" key={item.id} onClick={() => navigate(`/budgets/${item.id}`)}><span><strong>{categoryName(item.categoryId)}</strong><small><MoneyValue amount={item.currentAmount} hidden={hidden} size="small" /> de {formatCurrency(item.limitAmount, hidden)}</small></span><span>{usage}% · {status}</span><Progress value={usage} color={color} /><small className="dashboard-remaining">{formatCurrency(Math.max(0, item.limitAmount - item.currentAmount), hidden)} restante</small></button>; }) : <EmptyState title="Nenhum orçamento neste mês" detail="Crie limites para acompanhar seus gastos." />}</Card>
    </DashboardSection>

    <DashboardSection index={3}>
      <div className="section-heading"><div><h2>Planejamento</h2><p>Metas pessoais e objetivos compartilhados.</p></div></div>
      <div className="dashboard-duo">
        <Card><div className="section-heading"><div><h2>Metas pessoais</h2><p>{formatCurrency(piggyTotal(piggies), hidden)} guardados</p></div><Button variant="ghost" onClick={() => navigate("/piggy-banks")}>Ver todos</Button></div>{piggies.length ? piggies.slice(0, 3).map((item) => <button className="dashboard-plan-row" key={item.id} onClick={() => navigate(`/piggy-banks/${item.id}`)}><span className="plan-icon"><CircleDollarSign size={16} /></span><span><strong>{item.name}</strong><small><MoneyValue amount={item.currentAmount} hidden={hidden} size="small" /> de {formatCurrency(item.targetAmount, hidden)}</small><Progress value={percent(item.currentAmount, item.targetAmount)} color={item.status === "COMPLETED" ? "#f5c451" : "#4ade80"} />{item.currentAmount > item.targetAmount && <small className="goal-overage">{formatCurrency(item.currentAmount - item.targetAmount, hidden)} acima da meta</small>}</span><span>{item.status === "COMPLETED" ? "Concluída" : `${percent(item.currentAmount, item.targetAmount)}%`}</span></button>) : <EmptyState title="Nenhuma meta pessoal ativa" detail="Crie um porquinho para planejar uma meta." />}</Card>
        <Card><div className="section-heading"><div><h2>Grupos</h2><p>Planejamento compartilhado.</p></div><Button variant="ghost" onClick={() => navigate("/groups")}>Ver todos</Button></div>{groups.length ? groups.slice(0, 3).map((item) => { const fund = groupFundValue(item); return <button className="dashboard-plan-row" key={item.id} onClick={() => navigate(`/groups/${item.id}`)}><span className="plan-icon"><CircleDollarSign size={16} /></span><span><strong>{item.name}</strong><small>{groupLabel(item.type)} · {item.members.length} participante(s)</small>{item.targetAmount && <><small><MoneyValue amount={fund} hidden={hidden} size="small" /> de {formatCurrency(item.targetAmount, hidden)}</small><Progress value={percent(fund, item.targetAmount)} /></>}</span>{item.targetAmount && <span>{percent(fund, item.targetAmount)}%</span>}</button>; }) : <EmptyState title="Nenhum planejamento compartilhado" detail="Crie ou entre em um grupo para acompanhar objetivos juntos." />}</Card>
      </div>
    </DashboardSection>

    <DashboardSection index={4}><Card><div className="section-heading"><div><h2>Atividade recente</h2><p>Histórico mais recente, independente do mês selecionado.</p></div><Button variant="ghost" onClick={() => navigate("/transactions")}>Ver todos os lançamentos <ArrowRight size={14} /></Button></div>{recent.length ? recent.map((item) => <motion.button layout className="transaction-row dashboard-transaction-row" key={item.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionTokens.fast, ease: motionTokens.ease }} onClick={() => navigate(`/transactions?q=${encodeURIComponent(item.description)}`)}><span className="transaction-icon">{item.type === "INCOME" ? <ArrowUpRight size={15} /> : item.type === "EXPENSE" ? <ArrowDownRight size={15} /> : <ArrowLeftRight size={15} />}</span><span className="transaction-info"><strong>{item.description}</strong><small>{item.financialScope === "SHARED" ? "Fundo compartilhado" : item.type === "TRANSFER" ? "Transferência" : categoryName(item.categoryId)} · {formatDate(item.date)}</small></span><MoneyValue amount={item.amount} type={item.type === "INCOME" ? "income" : item.type === "EXPENSE" ? "expense" : undefined} hidden={hidden} size="small" /></motion.button>) : <EmptyState title="Nenhuma atividade recente" detail="Os lançamentos aparecem aqui assim que forem registrados." />}</Card></DashboardSection>
  </div>;
}
