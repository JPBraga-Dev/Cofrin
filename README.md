# Cofrin

Sistema de gestão financeira pessoal e compartilhada: controle diário, metas, cartões, grupos, despesas divididas e acerto inteligente.

## Objetivo

O Cofrin prioriza o controle individual e adiciona planejamento coletivo sem exigir que a pessoa participe de grupos. A demonstração aceita credenciais mockadas e não envia dados a serviços externos.

## Stack e arquitetura

- Front-end: React, TypeScript, Vite, React Router, Framer Motion, Lucide, Recharts e Zod.
- Back-end: Node.js, Express, TypeScript, Zod e Vitest.
- Fluxo do servidor: rota → controller → service → repository → fonte de dados.
- Persistência atual: repositórios mockados em memória. O front centraliza a futura integração em `frontend/src/services/api.ts`.

## Estrutura

```text
cofrin/
├── frontend/       # interface e demonstração navegável
├── backend/        # API e regras de negócio
├── supabase/       # schema, seed, RLS e plano de integração
├── docs/           # arquitetura, banco, regras e UI
└── package.json
```

## Instalação e execução

```bash
npm install
npm run dev
```

Front-end: http://localhost:5173 · API: http://localhost:3001/api/health.

## Scripts

```bash
npm run dev
npm run dev:frontend
npm run dev:backend
npm run build
npm run test
npm run lint
```

## Rotas

`/login`, `/register`, `/dashboard`, `/transactions`, `/calendar`, `/cards`, `/piggy-banks`, `/groups`, `/groups/:id`, `/budgets`, `/reports` e `/settings`.

## Mocks e regras financeiras

Os mocks estão centralizados em `frontend/src/mocks/data.ts` e `backend/src/data/mockDatabase.ts`, com mais de 20 lançamentos distribuídos por meses. Transferências não contam como receita ou despesa; uma compra no cartão só é contabilizada uma vez e o pagamento da fatura é liquidação. Porquinhos registram movimentos; despesas de grupo suportam divisão igual, percentual, por cotas e manual, com acertos calculados em centavos.

## Supabase futuro

`supabase/schema.sql` inclui tabelas, relacionamentos, RLS inicial, valores `numeric(14,2)` e timestamps. Configure `DATA_SOURCE=supabase` somente quando os adaptadores forem implementados em `backend/src/repositories/supabase/`. Nunca exponha a service role key ao front-end.

## Testes e roadmap

Os testes cobrem acertos, centavos, todos os modos de divisão, previsão de meta, orçamento e taxa de economia. Próximas etapas de produção: Supabase Auth, adaptadores persistentes, Storage para comprovantes/avatares/imagens de grupo e Realtime.
