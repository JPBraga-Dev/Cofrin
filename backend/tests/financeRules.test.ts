import { describe, expect, it } from 'vitest';
import { calculateSettlements } from '../src/services/debtSettlementService.js';
import { calculateBudgetStatus, calculateEstimatedCompletion, calculateSavingsRate, splitByPercentage, splitByShares, splitEvenly, splitManual } from '../src/services/financeRules.js';
import { createSplits } from '../src/services/groupFinanceService.js';

describe('debt settlement',()=>{
  it('settles one debtor to one creditor',()=>expect(calculateSettlements([{userId:'ana',balance:-50},{userId:'carlos',balance:50}])).toEqual([{fromUserId:'ana',toUserId:'carlos',amount:50,status:'SUGGESTED'}]));
  it('minimizes transfers',()=>expect(calculateSettlements([{userId:'a',balance:-100},{userId:'b',balance:40},{userId:'c',balance:60}])).toHaveLength(2));
  it('rounds settlement values to cents',()=>expect(calculateSettlements([{userId:'a',balance:-33.335},{userId:'b',balance:33.335}])[0].amount).toBe(33.34));
});
describe('expense splitting',()=>{
  it('splits evenly and preserves cents',()=>{expect(splitEvenly(120,['a','b','c','d']).map(x=>x.amount)).toEqual([30,30,30,30]);expect(splitEvenly(100,['a','b','c']).reduce((s,x)=>s+x.amount,0)).toBe(100)});
  it('supports percentage, shares and manual division',()=>{expect(splitByPercentage(100,[{memberId:'a',percentage:25},{memberId:'b',percentage:75}]).map(x=>x.amount)).toEqual([25,75]);expect(splitByShares(120,[{memberId:'a',shares:1},{memberId:'b',shares:3}]).map(x=>x.amount)).toEqual([30,90]);expect(splitManual(100,[{memberId:'a',amount:40},{memberId:'b',amount:60}])).toHaveLength(2)});
  it('creates all group split modes',()=>{expect(createSplits('e',400,['a','b','c'],'SHARES',[{userId:'a',shares:2},{userId:'b',shares:1},{userId:'c',shares:1}]).map(x=>x.amount)).toEqual([200,100,100]);expect(createSplits('e',100,['a','b'],'MANUAL',[{userId:'a',amount:30},{userId:'b',amount:70}]).map(x=>x.amount)).toEqual([30,70])});
  it('rejects invalid percentage and manual totals',()=>{expect(()=>splitByPercentage(100,[{memberId:'a',percentage:90}])).toThrow();expect(()=>splitManual(100,[{memberId:'a',amount:99}])).toThrow()});
});
describe('personal finance rules',()=>{
  it('calculates forecast and handles no contribution',()=>{expect(calculateEstimatedCompletion(1000,400,200,new Date('2026-01-01')).monthsRemaining).toBe(3);expect(calculateEstimatedCompletion(1000,400,0).estimatedDate).toBeNull()});
  it('calculates every budget status and savings rate',()=>{expect(calculateBudgetStatus(79,100)).toBe('SAFE');expect(calculateBudgetStatus(90,100)).toBe('WARNING');expect(calculateBudgetStatus(100,100)).toBe('LIMIT');expect(calculateBudgetStatus(110,100)).toBe('EXCEEDED');expect(calculateSavingsRate(1000,350)).toBe(65)});
  it('recognizes a completed goal',()=>expect(calculateEstimatedCompletion(1000,1000,100).completed).toBe(true));
});
