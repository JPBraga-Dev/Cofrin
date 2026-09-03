import { ArrowDownRight, ArrowUpRight, CalendarClock, ChevronLeft, ChevronRight, CircleDollarSign, Plus, Wallet } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button, Card, EmptyState, MoneyValue, PageHeader, Progress } from "../components/ui";
import { useAppData } from "../providers/AppDataProvider";
import { formatCurrency, formatDate, formatShortDate, percent } from "../utils/format";
import { accountName, budgetSpent, categoryName, groupLabel, piggyTotal, spendingByCategory } from "../utils/selectors";

const categoryColors = ["#4ade80", "#f5c451", "#ef7070", "#71717a"];

export function DashboardPage() {
  const navigate = useNavigate();
  const { transactions, piggies, groups, budgets, dashboard, hidden } = useAppData();
  const latestMonth = [...transactions].sort((a, b) => b.date.localeCompare(a.date))[0]?.date.slice(0, 7) ?? new Date().toISOString().slice(0, 7);
  const [referenceMonth, setReferenceMonth] = useState(latestMonth);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${referenceMonth}-01T12:00:00`));
  const currentTransactions = transactions.filter((item) => item.date.startsWith(referenceMonth));
  const monthIncome = currentTransactions.filter((item) => item.type === "INCOME").reduce((total, item) => total + item.amount, 0);
  const monthExpense = currentTransactions.filter((item) => item.type === "EXPENSE").reduce((total, item) => total + item.amount, 0);
  const balance = dashboard?.totalBalance ?? 0;
  const committed = dashboard?.committed ?? currentTransactions.filter((item) => item.status === "PENDING").reduce((total, item) => total + item.amount, 0);
  const accounts = dashboard?.accounts ?? [];
  const upcoming = transactions.filter((item) => item.status === "PENDING" || item.status === "OVERDUE").sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const categories = spendingByCategory(currentTransactions).sort((a, b) => b.amount - a.amount).slice(0, 4);
  const budgetItems = budgets.map((budget) => ({ ...budget, currentAmount: budgetSpent(budget, transactions) })).sort((a, b) => b.currentAmount / b.limitAmount - a.currentAmount / a.limitAmount).slice(0, 3);
  const flow = Object.entries(transactions.reduce<Record<string, { income: number; expense: number }>>((all, item) => {
    const key = item.date.slice(0, 7);
    const value = all[key] ?? { income: 0, expense: 0 };
    value.income += item.type === "INCOME" ? item.amount : 0;
    value.expense += item.type === "EXPENSE" ? item.amount : 0;
    all[key] = value;
    return all;
  }, {})).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, values]) => ({
    month: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(`${month}-01T12:00:00`)).replace(".", ""), ...values,
  }));
  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  return <div className="dashboard-page">
    <PageHeader eyebrow="Visão financeira" title="Visão geral" description="Seu mês até agora." action={<Button onClick={() => navigate("/transactions?new=1")}><Plus size={16} />Novo lançamento</Button>} />
    <div className="period-control" aria-label="Período de referência"><button aria-label="Mês anterior" onClick={() => { const date = new Date(`${referenceMonth}-01T12:00:00`); date.setMonth(date.getMonth() - 1); setReferenceMonth(date.toISOString().slice(0, 7)); }}><ChevronLeft size={15} /></button><strong>{monthLabel}</strong><button aria-label="Próximo mês" onClick={() => { const date = new Date(`${referenceMonth}-01T12:00:00`); date.setMonth(date.getMonth() + 1); setReferenceMonth(date.toISOString().slice(0, 7)); }}><ChevronRight size={15} /></button></div>
    <section className="dashboard-financial">
      <Card className="balance-card dashboard-balance"><div className="balance-kicker"><Wallet size={16} /><span>Saldo disponível</span></div><MoneyValue amount={balance} hidden={hidden} size="large" /><div className="balance-footer"><span className="live-indicator">Atualizado</span><span>Distribuído em {accounts.length || 1} conta{accounts.length === 1 ? "" : "s"}</span></div></Card>
      <div className="financial-stats">
        <Card className="stat-card"><div className="stat-label"><span>Receitas no mês</span><ArrowUpRight size={15} /></div><MoneyValue amount={monthIncome} type="income" hidden={hidden} /><small>{currentTransactions.filter((item) => item.type === "INCOME").length} entrada(s) no período</small></Card>
        <Card className="stat-card"><div className="stat-label"><span>Despesas no mês</span><ArrowDownRight size={15} /></div><MoneyValue amount={monthExpense} type="expense" hidden={hidden} /><small>{currentTransactions.filter((item) => item.type === "EXPENSE").length} saída(s) no período</small></Card>
        <Card className="stat-card committed-card"><div className="stat-label"><span>Comprometido</span><CalendarClock size={15} /></div><MoneyValue amount={committed} hidden={hidden} /><small>Contas, parcelas e faturas previstas.</small></Card>
      </div>
    </section>
    <section className="dashboard-section"><div className="section-heading"><div><h2>Fluxo financeiro</h2><p>Receitas e despesas nos últimos meses.</p></div></div><div className="dashboard-flow">
      <Card className="flow-card"><ResponsiveContainer width="100%" height={254}><BarChart data={flow} barGap={5}><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#8d8d94", fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#8d8d94", fontSize: 10 }} width={40} /><Tooltip cursor={{ fill: "#202023" }} contentStyle={{ background: "#171719", border: "1px solid #39393e", borderRadius: 10 }} formatter={(value: number) => formatCurrency(value, hidden)} /><Bar dataKey="income" name="Receitas" fill="#4ade80" radius={[4, 4, 0, 0]} /><Bar dataKey="expense" name="Despesas" fill="#e87878" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></Card>
      <Card className="category-card"><div className="section-heading"><div><h2>Gastos por categoria</h2><p>Este mês</p></div></div>{categories.length ? <><div className="category-donut"><ResponsiveContainer><PieChart><Pie data={categories} dataKey="amount" innerRadius={47} outerRadius={66} stroke="none">{categories.map((item, index) => <Cell key={item.categoryId} fill={categoryColors[index]} />)}</Pie><Tooltip contentStyle={{ background: "#171719", border: "1px solid #39393e", borderRadius: 10 }} formatter={(value: number) => formatCurrency(value, hidden)} /></PieChart></ResponsiveContainer></div><div className="category-list">{categories.map((item, index) => <div className="category-row" key={item.categoryId}><i className="dot" style={{ background: categoryColors[index] }} /><span>{item.name}</span><MoneyValue amount={item.amount} hidden={hidden} size="small" /></div>)}</div></> : <EmptyState title="Sem gastos neste mês" detail="As despesas aparecerão aqui." />}</Card>
    </div></section>
    <section className="dashboard-section dashboard-duo"><Card><div className="section-heading"><div><h2>Atenção do mês</h2><p>Próximos compromissos.</p></div><Button variant="ghost" onClick={() => navigate("/calendar")}>Calendário</Button></div>{upcoming.length ? upcoming.map((item) => <div className="bill-row" key={item.id}><span className={`bill-date ${item.status === "OVERDUE" ? "overdue" : ""}`}>{formatShortDate(item.date)}</span><div className="bill-info"><strong>{item.description}</strong><small>{accountName(item.accountId)} · {item.status === "OVERDUE" ? "Atrasado" : "Pendente"}</small></div><MoneyValue amount={item.amount} hidden={hidden} size="small" /></div>) : <EmptyState title="Nenhum compromisso próximo" detail="Contas pendentes aparecem aqui." />}</Card>
      <Card><div className="section-heading"><div><h2>Orçamentos</h2><p>Limites mais próximos.</p></div><Button variant="ghost" onClick={() => navigate("/budgets")}>Ver todos</Button></div>{budgetItems.length ? budgetItems.map((item) => { const usage = percent(item.currentAmount, item.limitAmount); const color = usage >= 100 ? "#ef4444" : usage >= 80 ? "#f5c451" : "#4ade80"; return <button className="dashboard-budget-row" key={item.id} onClick={() => navigate(`/budgets/${item.id}`)}><div><strong>{categoryName(item.categoryId)}</strong><small><MoneyValue amount={item.currentAmount} hidden={hidden} size="small" /> de {formatCurrency(item.limitAmount, hidden)}</small></div><span>{usage}%</span><Progress value={usage} color={color} /></button>; }) : <EmptyState title="Nenhum orçamento neste mês" detail="Crie limites para acompanhar seus gastos." />}</Card>
    </section>
    <section className="dashboard-section"><div className="section-heading"><div><h2>Planejamento</h2><p>Metas pessoais e objetivos compartilhados.</p></div></div><div className="dashboard-duo"><Card><div className="section-heading"><div><h2>Porquinhos</h2><p>{formatCurrency(piggyTotal(piggies), hidden)} guardados</p></div><Button variant="ghost" onClick={() => navigate("/piggy-banks")}>Ver todos</Button></div>{piggies.slice(0, 3).map((item) => <button className="dashboard-plan-row" key={item.id} onClick={() => navigate("/piggy-banks")}><span className="plan-icon"><CircleDollarSign size={16} /></span><div><strong>{item.name}</strong><small><MoneyValue amount={item.currentAmount} hidden={hidden} size="small" /> de {formatCurrency(item.targetAmount, hidden)}</small><Progress value={percent(item.currentAmount, item.targetAmount)} color={item.status === "COMPLETED" ? "#f5c451" : "#4ade80"} /></div><span>{percent(item.currentAmount, item.targetAmount)}%</span></button>)}</Card>
      <Card><div className="section-heading"><div><h2>Grupos</h2><p>Planejamento compartilhado.</p></div><Button variant="ghost" onClick={() => navigate("/groups")}>Ver todos</Button></div>{groups.slice(0, 3).map((item) => { const fund = item.contributions.filter((entry) => entry.status === "CONFIRMED").reduce((total, entry) => total + entry.amount, 0) - item.expenses.filter((entry) => entry.paymentSource === "GROUP_FUND").reduce((total, entry) => total + entry.amount, 0); return <button className="dashboard-plan-row" key={item.id} onClick={() => navigate(`/groups/${item.id}`)}><span className="plan-icon"><CircleDollarSign size={16} /></span><div><strong>{item.name}</strong><small>{groupLabel(item.type)} · {item.members.length} participante(s)</small>{item.targetAmount && <Progress value={percent(fund, item.targetAmount)} />}</div>{item.targetAmount && <span>{percent(fund, item.targetAmount)}%</span>}</button>; })}</Card></div></section>
    <section className="dashboard-section"><Card><div className="section-heading"><div><h2>Movimentações recentes</h2><p>O que aconteceu por último.</p></div><Button variant="ghost" onClick={() => navigate("/transactions")}>Ver todos os lançamentos</Button></div>{recent.map((item) => <div className="transaction-row" key={item.id}><span className="transaction-icon">{item.type === "INCOME" ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}</span><div className="transaction-info"><strong>{item.description}</strong><small>{categoryName(item.categoryId)} · {formatDate(item.date)}</small></div><MoneyValue amount={item.amount} type={item.type === "INCOME" ? "income" : item.type === "EXPENSE" ? "expense" : undefined} hidden={hidden} size="small" /></div>)}</Card></section>
  </div>;
}
