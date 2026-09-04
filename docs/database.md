# Banco de dados

`supabase/schema.sql` define o modelo canônico e utiliza `bigint` em centavos para todo valor monetário. Saldos e totais derivados não são duplicados quando podem ser obtidos pelo razão.

A base distingue o razão pessoal (`transactions.financial_scope = PERSONAL`) do razão compartilhado (`SHARED`). `group_contributions`, `group_expenses` e `group_fund_movements` mantêm vínculos de auditoria com transações sem acessar contas privadas de outro membro. Faturas são derivadas das compras pelo `invoice_reference`; pagamentos ficam em `credit_card_invoice_payments` e apontam para uma transferência.

O backend é a autoridade de autenticação. O futuro adapter PostgreSQL deve definir `SET LOCAL app.user_id` em cada transação e usar uma role sem `BYPASSRLS`. A service role nunca vai para o frontend. As políticas permitem acesso aos próprios dados e leitura compartilhada somente a membros ativos do grupo ou da conversa.

A persistência ativa ainda é em memória. O valor `DATA_SOURCE=supabase` é reservado e só deve ser usado quando os adapters e testes de integração estiverem implementados.
