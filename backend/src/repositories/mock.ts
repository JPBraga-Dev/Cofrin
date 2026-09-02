import { mockDatabase } from '../data/mockDatabase.js'; import type { Budget, Group, PiggyBank, Transaction } from '../domain/types.js'; import type { BudgetRepository, GroupRepository, PiggyBankRepository, TransactionRepository } from './interfaces.js';
function repository<T extends {id:string}>(items:T[]){return{async list(){return items},async findById(id:string){return items.find(x=>x.id===id)},async create(item:T){items.push(item);return item},async update(id:string,patch:Partial<T>){const i=items.findIndex(x=>x.id===id);if(i<0)return undefined;items[i]={...items[i],...patch};return items[i]},async delete(id:string){const i=items.findIndex(x=>x.id===id);if(i<0)return false;items.splice(i,1);return true}}}
export const transactionRepository:TransactionRepository=repository<Transaction>(mockDatabase.transactions);
export const piggyBankRepository:PiggyBankRepository=repository<PiggyBank>(mockDatabase.piggyBanks);
export const groupRepository:GroupRepository=repository<Group>(mockDatabase.groups);
export const budgetRepository:BudgetRepository=repository<Budget>(mockDatabase.budgets);
