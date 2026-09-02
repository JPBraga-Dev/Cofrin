export function calculatePercentage(current, total) { return total <= 0 ? 0 : Math.min(100, Math.round((current / total) * 10000) / 100); }
export function calculateSavingsRate(income, expenses) { return income <= 0 ? 0 : Math.round(((income - expenses) / income) * 10000) / 100; }
export function calculateBudgetStatus(spent, limit) { if (spent > limit)
    return 'EXCEEDED'; if (spent === limit && limit > 0)
    return 'LIMIT'; if (limit > 0 && spent / limit >= .8)
    return 'WARNING'; return 'SAFE'; }
export function calculateEstimatedCompletion(target, current, monthly, from = new Date()) { if (current >= target)
    return { monthsRemaining: 0, estimatedDate: from.toISOString().slice(0, 10), completed: true }; if (monthly <= 0)
    return { monthsRemaining: null, estimatedDate: null, completed: false }; const monthsRemaining = Math.ceil((target - current) / monthly); const date = new Date(from); date.setMonth(date.getMonth() + monthsRemaining); return { monthsRemaining, estimatedDate: date.toISOString().slice(0, 10), completed: false }; }
export function splitEvenly(amount, memberIds) { const cents = Math.round(amount * 100), base = Math.floor(cents / memberIds.length), remainder = cents % memberIds.length; return memberIds.map((memberId, index) => ({ memberId, amount: (base + (index < remainder ? 1 : 0)) / 100 })); }
export function splitByPercentage(amount, shares) { const total = shares.reduce((sum, x) => sum + x.percentage, 0); if (Math.abs(total - 100) > .001)
    throw new Error('Percentages must total 100'); const cents = Math.round(amount * 100); let used = 0; return shares.map((item, index) => { const value = index === shares.length - 1 ? cents - used : Math.round(cents * item.percentage / 100); used += value; return { memberId: item.memberId, amount: value / 100 }; }); }
export function splitByShares(amount, shares) { const total = shares.reduce((sum, x) => sum + x.shares, 0); if (total <= 0)
    throw new Error('Shares must be positive'); const cents = Math.round(amount * 100); let used = 0; return shares.map((item, index) => { const value = index === shares.length - 1 ? cents - used : Math.round(cents * item.shares / total); used += value; return { memberId: item.memberId, amount: value / 100 }; }); }
export function splitManual(amount, shares) { const total = Math.round(shares.reduce((sum, x) => sum + x.amount, 0) * 100); if (total !== Math.round(amount * 100))
    throw new Error('Manual split must match total'); return shares; }
