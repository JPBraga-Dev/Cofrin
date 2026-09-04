# Arquitetura

O Cofrin é um monorepo npm: React/Vite no `frontend` e Express/TypeScript no `backend`. O navegador fala somente com `/api`; credenciais e regras financeiras permanecem no servidor.

O fluxo principal é rota → controller → service → repository. Controllers validam transporte, services controlam autorização, centavos, atomicidade e compensação, e repositories escondem a fonte de dados. A implementação ativa é em memória. O schema PostgreSQL é um contrato para o adapter persistente futuro, não uma integração simulada.

A autenticação é própria: senha Argon2id, cookie de sessão `HttpOnly`, expiração absoluta e por inatividade, revogação e recuperação por token de uso único. Falhas 5xx não apagam a identidade do frontend; somente uma resposta 401 encerra a sessão local.

Dinheiro é calculado em centavos inteiros. Transferências são neutras em receita/despesa. Uma contribuição conta→grupo debita a conta e credita o fundo em um fluxo; uma despesa paga pelo fundo reduz apenas o razão compartilhado. Compras parceladas geram competências mensais e o pagamento de fatura é uma transferência, nunca uma segunda despesa.

O estado do front separa recursos carregados, mensagens por conversa e mutações pendentes. Uma falha parcial preserva dados válidos já exibidos. Perfil, sidebar, social, grupos e conversas compartilham a mesma identidade por `userId`.
