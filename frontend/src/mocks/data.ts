import type { Budget, Group, PiggyBank, Transaction } from '../types';
export const mockUser = { name: 'João Braga', initials: 'JB' };
export const chartData = [{ month:'Mar', income:6200, expenses:3870 },{ month:'Abr', income:6500, expenses:4240 },{ month:'Mai', income:6800, expenses:3900 },{ month:'Jun', income:7100, expenses:4610 },{ month:'Jul', income:7200, expenses:4380 },{ month:'Ago', income:7500, expenses:4328.5 }];
export const categoryData = [{ name:'Moradia', value:1450, color:'#71717a' },{ name:'Alimentação', value:932, color:'#f5c451' },{ name:'Transporte', value:518, color:'#4ade80' },{ name:'Lazer', value:445, color:'#f472b6' },{ name:'Assinaturas', value:283.5, color:'#a78bfa' },{ name:'Saúde', value:700, color:'#38bdf8' }];
export const initialTransactions: Transaction[] = [
 {id:'t1',description:'Salário mensal',amount:6500,type:'INCOME',nature:'PERSONAL',date:'2026-08-05',category:'Salário',account:'Conta principal',status:'RECEIVED',paymentMethod:'Transferência'},
 {id:'t2',description:'Projeto Horizonte',amount:1000,type:'INCOME',nature:'PERSONAL',date:'2026-08-16',category:'Freelance',account:'Conta principal',status:'RECEIVED',paymentMethod:'PIX'},
 {id:'t3',description:'Aluguel',amount:1450,type:'EXPENSE',nature:'PERSONAL',date:'2026-08-02',category:'Moradia',account:'Conta principal',status:'PAID',paymentMethod:'PIX'},
 {id:'t4',description:'Supermercado Verde',amount:284.7,type:'EXPENSE',nature:'PERSONAL',date:'2026-08-27',category:'Alimentação',account:'Cartão Nubank',status:'PAID',paymentMethod:'Crédito'},
 {id:'t5',description:'Netflix',amount:55.9,type:'EXPENSE',nature:'PERSONAL',date:'2026-09-05',category:'Assinaturas',account:'Cartão Nubank',status:'PENDING',paymentMethod:'Crédito'},
 {id:'t6',description:'Uber',amount:42.5,type:'EXPENSE',nature:'PERSONAL',date:'2026-08-28',category:'Transporte',account:'Conta principal',status:'PAID',paymentMethod:'PIX'},
 {id:'t7',description:'Academia',amount:129.9,type:'EXPENSE',nature:'PERSONAL',date:'2026-08-10',category:'Saúde',account:'Conta principal',status:'PAID',paymentMethod:'PIX'},
 {id:'t8',description:'Notebook Pro',amount:399.9,type:'EXPENSE',nature:'CREDIT_CARD',date:'2026-08-12',category:'Educação',account:'Cartão Nubank',status:'PAID',paymentMethod:'Crédito',installment:'3/12'},
 {id:'t9',description:'Internet casa',amount:119.9,type:'EXPENSE',nature:'PERSONAL',date:'2026-09-03',category:'Moradia',account:'Conta principal',status:'PENDING',paymentMethod:'Boleto'},
 {id:'t10',description:'Restaurante Manjericão',amount:186,type:'EXPENSE',nature:'GROUP',date:'2026-08-24',category:'Lazer',account:'Cartão Nubank',status:'PAID',paymentMethod:'Crédito'},
 {id:'t11',description:'Curso de inglês',amount:240,type:'EXPENSE',nature:'PERSONAL',date:'2026-08-14',category:'Educação',account:'Conta principal',status:'PAID',paymentMethod:'PIX'},
 {id:'t12',description:'Spotify',amount:21.9,type:'EXPENSE',nature:'PERSONAL',date:'2026-08-08',category:'Assinaturas',account:'Cartão Nubank',status:'PAID',paymentMethod:'Crédito'},
 {id:'t13',description:'Farmácia Central',amount:76.4,type:'EXPENSE',nature:'PERSONAL',date:'2026-08-22',category:'Saúde',account:'Conta principal',status:'PAID',paymentMethod:'Débito'},
 {id:'t14',description:'Cinema',amount:58,type:'EXPENSE',nature:'PERSONAL',date:'2026-08-20',category:'Lazer',account:'Cartão Nubank',status:'PAID',paymentMethod:'Crédito'},
 {id:'t15',description:'Combustível',amount:180,type:'EXPENSE',nature:'PERSONAL',date:'2026-08-18',category:'Transporte',account:'Conta principal',status:'PAID',paymentMethod:'PIX'},
 {id:'t16',description:'Conta de energia',amount:186.4,type:'EXPENSE',nature:'PERSONAL',date:'2026-09-12',category:'Moradia',account:'Conta principal',status:'PENDING',paymentMethod:'Boleto'},
 {id:'t17',description:'Aporte viagem',amount:550,type:'TRANSFER',nature:'PIGGY_BANK',date:'2026-08-25',category:'Metas',account:'Conta principal',status:'PAID',paymentMethod:'Transferência'},
 {id:'t18',description:'Venda de equipamento',amount:450,type:'INCOME',nature:'PERSONAL',date:'2026-07-28',category:'Extra',account:'Conta principal',status:'RECEIVED',paymentMethod:'PIX'},
 {id:'t19',description:'Mercado Bom Preço',amount:193.2,type:'EXPENSE',nature:'PERSONAL',date:'2026-07-25',category:'Alimentação',account:'Cartão Nubank',status:'PAID',paymentMethod:'Crédito'},
 {id:'t20',description:'Plano celular',amount:59.9,type:'EXPENSE',nature:'PERSONAL',date:'2026-07-12',category:'Assinaturas',account:'Conta principal',status:'PAID',paymentMethod:'PIX'},
 {id:'t21',description:'Restituição',amount:312,type:'INCOME',nature:'PERSONAL',date:'2026-06-18',category:'Reembolso',account:'Conta principal',status:'RECEIVED',paymentMethod:'PIX'},
 {id:'t22',description:'Consulta médica',amount:220,type:'EXPENSE',nature:'PERSONAL',date:'2026-06-14',category:'Saúde',account:'Conta principal',status:'PAID',paymentMethod:'PIX'},
 {id:'t23',description:'Curso online',amount:189.9,type:'EXPENSE',nature:'CREDIT_CARD',date:'2026-05-09',category:'Educação',account:'Cartão Nubank',status:'PAID',paymentMethod:'Crédito',installment:'2/6'},
 {id:'t24',description:'Bônus de desempenho',amount:850,type:'INCOME',nature:'PERSONAL',date:'2026-05-05',category:'Bônus',account:'Conta principal',status:'RECEIVED',paymentMethod:'Transferência'}
];
export const initialPiggies: PiggyBank[] = [
 {id:'p1',name:'Viagem de fim de ano',description:'Chapada dos Veadeiros com calma',currentAmount:3150,targetAmount:6000,monthlyContribution:550,deadline:'2026-12-15',icon:'✈️',status:'ACTIVE',movements:[{id:'m1',type:'DEPOSIT',amount:550,date:'2026-08-25',description:'Aporte de agosto'},{id:'m2',type:'DEPOSIT',amount:700,date:'2026-07-25',description:'Bônus'}]},
 {id:'p2',name:'Notebook novo',description:'Troca do equipamento de trabalho',currentAmount:4200,targetAmount:7500,monthlyContribution:650,deadline:'2027-02-01',icon:'💻',status:'ACTIVE',movements:[{id:'m3',type:'DEPOSIT',amount:650,date:'2026-08-15',description:'Aporte mensal'}]},
 {id:'p3',name:'Reserva de emergência',description:'Seis meses de tranquilidade',currentAmount:8200,targetAmount:12000,monthlyContribution:800,deadline:'2027-01-01',icon:'🛟',status:'ACTIVE',movements:[{id:'m4',type:'DEPOSIT',amount:800,date:'2026-08-05',description:'Aporte mensal'}]}
];
export const initialGroups: Group[] = [
 {id:'g1',name:'Viagem para Jericoacoara',type:'VIAGEM',description:'Sete dias de sol, dunas e bons encontros.',targetAmount:10000,fund:6800,totalExpenses:1200,eventDate:'2026-11-12',emoji:'🌊',color:'#38bdf8',members:[{id:'u1',name:'João',initials:'JB',contribution:2200,balance:-380},{id:'u2',name:'Maria',initials:'MS',contribution:1800,balance:300},{id:'u3',name:'Lucas',initials:'LA',contribution:1600,balance:80},{id:'u4',name:'Ana',initials:'AS',contribution:1200,balance:0}],activity:['Maria adicionou R$ 300','João registrou Hotel por R$ 1.200','Lucas entrou no grupo']},
 {id:'g2',name:'Churrasco da turma',type:'EVENTO',description:'Encontro de setembro.',targetAmount:2500,fund:1100,totalExpenses:0,eventDate:'2026-09-20',emoji:'🔥',color:'#f5c451',members:[{id:'u1',name:'João',initials:'JB',contribution:350,balance:-75},{id:'u5',name:'Pedro',initials:'PF',contribution:450,balance:75},{id:'u2',name:'Maria',initials:'MS',contribution:300,balance:0}],activity:['Pedro confirmou presença','Maria adicionou R$ 300']},
 {id:'g3',name:'Casa de praia',type:'CASA',description:'Reformas e despesas do verão.',targetAmount:5000,fund:4550,totalExpenses:3100,eventDate:'2026-10-03',emoji:'🏖️',color:'#f472b6',members:[{id:'u1',name:'João',initials:'JB',contribution:1600,balance:200},{id:'u3',name:'Lucas',initials:'LA',contribution:1550,balance:-200},{id:'u4',name:'Ana',initials:'AS',contribution:1400,balance:0}],activity:['João pagou a reforma da varanda']}
];
export const budgets: Budget[] = [{id:'b1',category:'Alimentação',limit:1100,spent:932,color:'#f5c451'},{id:'b2',category:'Lazer',limit:400,spent:445,color:'#f472b6'},{id:'b3',category:'Transporte',limit:650,spent:518,color:'#4ade80'},{id:'b4',category:'Assinaturas',limit:350,spent:283.5,color:'#a78bfa'}];
export const notifications = ['A fatura do Cartão Nubank vence em 11 dias.','Alimentação chegou a 85% do orçamento.','Sua meta Viagem de fim de ano passou de 50%.','Maria adicionou R$ 300 ao grupo Jericoacoara.'];
