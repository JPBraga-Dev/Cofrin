import { mockDatabase } from '../data/mockDatabase.js';
function repository(items) { return { async list() { return items; }, async findById(id) { return items.find(x => x.id === id); }, async create(item) { items.push(item); return item; }, async update(id, patch) { const i = items.findIndex(x => x.id === id); if (i < 0)
        return undefined; items[i] = { ...items[i], ...patch }; return items[i]; }, async delete(id) { const i = items.findIndex(x => x.id === id); if (i < 0)
        return false; items.splice(i, 1); return true; } }; }
export const transactionRepository = repository(mockDatabase.transactions);
export const piggyBankRepository = repository(mockDatabase.piggyBanks);
export const groupRepository = repository(mockDatabase.groups);
export const budgetRepository = repository(mockDatabase.budgets);
