# Cofrin

Gestão financeira pessoal e compartilhada com contas, lançamentos, orçamento mensal, cartões e faturas, porquinhos, grupos, perfil e conversas.

## Estado do projeto

O produto roda de ponta a ponta com React e uma API Express. A persistência ativa é intencionalmente em memória: reiniciar o backend restaura os dados de demonstração. O contrato PostgreSQL está em `supabase/schema.sql`, mas os adapters ainda não foram implementados; portanto `DATA_SOURCE=supabase` não deve ser usado.

## Stack e arquitetura

- Frontend: React 18, TypeScript, Vite, React Router, Framer Motion, Lucide, Recharts e Zod.
- Backend: Node.js, Express 5, TypeScript, Zod, Argon2id, Sharp e Vitest.
- Fluxo: rota → controller → service → repository.
- Autenticação: própria do Cofrin, com cookie `HttpOnly`, sessão revogável, validade absoluta de 7 dias e inatividade máxima de 24 horas.
- Dinheiro: regras executadas em centavos inteiros; valores decimais existem apenas nas bordas da API e da interface.

## Executar localmente

Requisitos: Node.js 20+ e npm 10+.

```powershell
cd C:\Users\jpbra\Documents\GitHub\Cofrin
npm install
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173). A API responde em [http://localhost:3001/api/health](http://localhost:3001/api/health).

Em desenvolvimento, a tela de login informa a conta de demonstração:

```text
joao@cofrin.app
CofrinDemo2026!
```

Se uma porta estiver ocupada, encerre o processo anterior antes de iniciar outra instância. Não abra uma segunda cópia do backend na porta 3001.

## Variáveis de ambiente

Copie os exemplos somente quando precisar alterar os padrões:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Backend:

- `PORT`: porta HTTP, padrão `3001`.
- `ALLOWED_ORIGINS`: origens CORS separadas por vírgula.
- `PUBLIC_APP_ORIGIN`: origem usada em links de recuperação.
- `PUBLIC_API_ORIGIN`: origem usada nas URLs de avatar e capa.
- `PASSWORD_RESET_WEBHOOK_URL`: endpoint obrigatório para entrega de recuperação em produção.
- `DATA_SOURCE`: mantenha `mock` até existirem adapters persistentes.
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`: reservadas ao backend; nunca use a service role no Vite.

Frontend:

- `VITE_API_URL`: padrão `http://localhost:3001/api`.

## Rotas

Públicas: `/login`, `/register`, `/forgot-password` e `/reset-password`.

Autenticadas: `/dashboard`, `/transactions`, `/calendar`, `/cards`, `/piggy-banks`, `/piggy-banks/:id`, `/groups`, `/groups/:id`, `/budgets`, `/budgets/:id`, `/reports`, `/social`, `/profile`, `/u/:username` e `/settings`.

## Regras financeiras importantes

- Transferências não são receita nem despesa.
- Conta→porquinho e conta→grupo são operações vinculadas; não existe o fluxo antigo de “aportar” sem origem.
- Uma despesa paga pelo fundo do grupo reduz somente o fundo compartilhado. Quando o próprio usuário paga, uma conta pessoal explícita é obrigatória. O Cofrin nunca acessa a conta privada de outro membro.
- Compras parceladas são distribuídas por competência da fatura, com soma exata em centavos.
- Pagar fatura cria uma transferência de liquidação e não duplica a despesa da compra.
- Dashboard e orçamentos consideram somente despesas pessoais e o mês selecionado.

## Segurança e mídia

Senhas usam Argon2id. Cookies são `HttpOnly`, `SameSite=Lax` e `Secure` em produção. Recuperação usa tokens de uso único com expiração de 20 minutos; em produção o token só é enviado pelo notificador configurado. O rate limiter em memória é adequado ao modo local e deve ser trocado por armazenamento compartilhado antes de escalar horizontalmente.

Avatar e capa são tratados como mídia pública do perfil. Upload e remoção passam pelo backend, com validação e compensação atômica. Nenhum e-mail ou dado financeiro faz parte do caminho público da imagem.

## Qualidade

```powershell
npm run lint
npm run build
npm test
npm run test:e2e
```

Os testes unitários e de integração cobrem autenticação, autorização, centavos, ledger de contas/grupos, divisão, orçamento, social, faturas e componentes críticos. O Playwright cobre login, proteção de rotas, navegação principal e logout em desktop e mobile. Na primeira execução do E2E, instale o navegador com `npx playwright install chromium`.

## Pacote portátil

```powershell
npm run package:source
```

O comando gera `cofrin-source.zip` somente com fontes, configurações, documentação e lockfile. Ele exclui `.git`, `node_modules`, builds, armazenamento de uploads, relatórios de teste, logs, caches e segredos. Após extrair em outra máquina: `npm install`, `npm run build`, `npm test` e `npm run dev`.

## Banco futuro

`supabase/schema.sql` é o contrato canônico para uma instalação nova: autenticação própria, valores `bigint` em centavos, mídia versionada, RLS por usuário/membro, razão de grupo, mensagens e pagamentos de fatura. Veja `supabase/README.md` antes de implementar os adapters.
