export const formatCurrency = (value: number, hidden = false) => hidden ? 'R$ ••••••' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
export const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`));
export const formatShortDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`)).replace('.', '').toUpperCase();
export const percent = (current: number, total: number) => total ? Math.min(100, Math.round((current / total) * 100)) : 0;
export const budgetStatus = (spent: number, limit: number) => spent > limit ? 'ultrapassado' : spent / limit >= .8 ? 'em alerta' : 'seguro';
