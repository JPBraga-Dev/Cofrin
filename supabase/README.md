# Supabase future integration

1. Create a Supabase project and apply `schema.sql` in the SQL editor or migration runner.
2. Keep `SUPABASE_SERVICE_ROLE_KEY` exclusive to the back-end. Never expose it in Vite variables.
3. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only after Auth is enabled.
4. Implement adapters in `backend/src/repositories/supabase/` that satisfy the existing repository interfaces, then choose them through `DATA_SOURCE=supabase`.

Planned Storage buckets: `receipts`, `avatars` and `group-images`. Group policies must include active members, while owner-only operations cover group editing, membership management and cancellation.
