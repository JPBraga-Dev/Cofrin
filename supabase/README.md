# Contrato PostgreSQL/Supabase

O arquivo `schema.sql` é o contrato canônico para uma base nova. A aplicação atual ainda usa os repositórios em memória; `DATA_SOURCE=supabase` não deve ser ativado antes da implementação e dos testes dos adapters em `backend/src/repositories/supabase/`.

## Autoridade de autenticação

O Cofrin possui autenticação própria no backend. `users`, `sessions` e `password_reset_tokens` são a fonte de verdade; não existe dependência de `auth.users`. Em cada transação autenticada, o futuro adapter deve executar `SET LOCAL app.user_id = '<uuid>'`. A role do aplicativo não pode possuir `BYPASSRLS`. Chaves administrativas ficam exclusivamente no backend.

## Dinheiro

Todos os valores persistidos terminam em `_cents` e usam `bigint`. A conversão para decimal ocorre somente nas bordas HTTP/UI. Divisões de grupos e parcelas distribuem centavos residuais de modo determinístico.

## Avatar e capa

A política escolhida é leitura pública da imagem e escrita autenticada apenas pelo backend. URLs usam UUID do usuário e versão, sem e-mail ou outro dado privado. Avatar e capa são conteúdo público deliberado do perfil; nenhuma informação de conta é armazenada no objeto. Em produção, crie o bucket público `profile-media`, limite MIME/tamanho no backend e mantenha a credencial de escrita fora do Vite. Se o produto passar a aceitar mídia privada, troque para bucket privado e URLs assinadas antes de armazenar esse conteúdo.

## Aplicação

1. Crie uma base vazia e aplique `schema.sql` uma única vez.
2. Implemente adapters para todas as interfaces de repositório.
3. Garanta transações atômicas nos fluxos conta↔porquinho, conta→grupo, despesa de grupo, parcelas e pagamento de fatura.
4. Rode testes de integração contra uma base descartável.
5. Só então habilite `DATA_SOURCE=supabase`.

Os arquivos em `migrations/0001_initial.sql` e `0002_social.sql` são registros históricos anteriores à decisão de autenticação própria. Não devem ser aplicados em instalações novas.
