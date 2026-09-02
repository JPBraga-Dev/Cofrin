# Arquitetura

O Cofrin é um monorepo npm com React/Vite no `frontend` e Express/TypeScript no `backend`. A interface consome mocks consistentes durante a demonstração e a API expõe a mesma linguagem de domínio em `/api`.

No servidor, as rotas encaminham para controllers, que validam entradas com Zod e delegam persistência aos repositórios. Regras de domínio (divisões, previsão de meta, orçamento e acerto de dívidas) ficam em `services/`. Os services não importam Supabase. Hoje a composição usa `repositories/mock.ts`; a implementação futura deve cumprir as interfaces em `repositories/interfaces.ts`.

Valores de demonstração são `number` e a documentação assume `numeric(14,2)` no PostgreSQL. Funções de divisão trabalham em centavos e retornam valores arredondados.
