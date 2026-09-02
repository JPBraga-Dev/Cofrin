# Banco de dados e Supabase

`supabase/schema.sql` contém as tabelas essenciais, chaves estrangeiras, timestamps e políticas RLS iniciais. As tabelas de usuário devem receber política baseada em `auth.uid()`. Para grupos, políticas adicionais devem permitir a leitura e a escrita aos membros ativos do grupo, além do proprietário.

Configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` somente no servidor; a chave de serviço nunca deve ser exposta ao front-end. A futura implementação deve selecionar o adaptador Supabase quando `DATA_SOURCE=supabase`.
