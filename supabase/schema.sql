-- Cofrin canonical PostgreSQL contract (fresh databases).
-- Authentication is owned by the Cofrin API, not Supabase Auth. Every monetary
-- value is persisted as integer cents; adapters convert only at the API boundary.
create extension if not exists "pgcrypto";

create type user_status as enum ('ACTIVE', 'DISABLED');
create type transaction_type as enum ('INCOME', 'EXPENSE', 'TRANSFER');
create type transaction_status as enum ('PAID', 'RECEIVED', 'PENDING', 'OVERDUE');
create type financial_scope as enum ('PERSONAL', 'SHARED');

create or replace function cofrin_current_user_id() returns uuid
language sql stable
as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;

create table users (
  id uuid primary key default gen_random_uuid(),
  email_normalized text not null,
  password_hash text not null,
  status user_status not null default 'ACTIVE',
  email_verified_at timestamptz,
  last_login_at timestamptz,
  password_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index users_email_normalized_unique on users(lower(email_normalized));

create table profiles (
  user_id uuid primary key references users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  username text not null check (username ~ '^[a-z0-9._]{3,30}$'),
  bio text check (char_length(bio) <= 160),
  avatar_path text,
  avatar_version integer not null default 0,
  cover_path text,
  cover_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_username_lower_unique on profiles(lower(username));

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_ip_metadata text,
  user_agent_metadata text
);
create index sessions_user_active on sessions(user_id, expires_at) where revoked_at is null;

create table password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index audit_logs_user_occurred on audit_logs(user_id, occurred_at desc);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('CHECKING', 'CASH', 'SAVINGS')),
  initial_balance_cents bigint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  transaction_type transaction_type,
  color_token text,
  icon_token text,
  created_at timestamptz not null default now()
);

create table credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  brand text not null,
  last_four_digits text not null check (last_four_digits ~ '^[0-9]{4}$'),
  credit_limit_cents bigint not null check (credit_limit_cents >= 0),
  closing_day integer not null check (closing_day between 1 and 31),
  due_day integer not null check (due_day between 1 and 31),
  color_token text not null default 'carbon',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id),
  name text not null,
  description text not null default '',
  type text not null check (type in ('TRIP', 'EVENT', 'HOUSE', 'GIFT', 'COUPLE', 'GOAL', 'OTHER')),
  target_amount_cents bigint check (target_amount_cents >= 0),
  initial_fund_amount_cents bigint not null default 0,
  event_date date,
  image_path text,
  status text not null check (status in ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type transaction_type not null,
  nature text not null check (nature in ('PERSONAL', 'CREDIT_CARD', 'GROUP', 'PIGGY_BANK', 'ACCOUNT_TRANSFER')),
  financial_scope financial_scope not null default 'PERSONAL',
  description text not null,
  amount_cents bigint not null check (amount_cents > 0),
  transaction_date date not null,
  category_id uuid references categories(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  payment_method text not null,
  status transaction_status not null,
  recurrence_type text not null default 'SINGLE' check (recurrence_type in ('SINGLE', 'RECURRING', 'INSTALLMENT')),
  notes text,
  group_id uuid references groups(id) on delete set null,
  credit_card_id uuid references credit_cards(id) on delete set null,
  installment_number integer,
  installment_count integer,
  parent_transaction_id uuid references transactions(id) on delete set null,
  source_account_id uuid references accounts(id) on delete set null,
  destination_account_id uuid references accounts(id) on delete set null,
  source_piggy_bank_id uuid,
  destination_piggy_bank_id uuid,
  destination_group_id uuid references groups(id) on delete set null,
  destination_credit_card_id uuid references credit_cards(id) on delete set null,
  invoice_reference text check (invoice_reference is null or invoice_reference ~ '^[0-9]{4}-[0-9]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (installment_number is null or installment_number > 0),
  check (installment_count is null or installment_count > 0)
);
create index transactions_user_date on transactions(user_id, transaction_date desc);
create index transactions_card_invoice on transactions(credit_card_id, invoice_reference) where credit_card_id is not null;

create table piggy_banks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text not null default '',
  target_amount_cents bigint not null check (target_amount_cents > 0),
  initial_amount_cents bigint not null default 0,
  monthly_contribution_cents bigint,
  deadline date,
  icon_token text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'COMPLETED', 'PAUSED', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table transactions add constraint transactions_source_piggy_fk foreign key (source_piggy_bank_id) references piggy_banks(id) on delete set null;
alter table transactions add constraint transactions_destination_piggy_fk foreign key (destination_piggy_bank_id) references piggy_banks(id) on delete set null;

create table piggy_bank_movements (
  id uuid primary key default gen_random_uuid(),
  piggy_bank_id uuid not null references piggy_banks(id) on delete cascade,
  user_id uuid not null references users(id),
  type text not null check (type in ('DEPOSIT', 'WITHDRAWAL')),
  amount_cents bigint not null check (amount_cents > 0),
  movement_date date not null,
  description text,
  account_id uuid references accounts(id) on delete set null,
  transaction_id uuid unique references transactions(id) on delete set null,
  created_at timestamptz not null default now()
);

create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references users(id),
  role text not null default 'MEMBER' check (role in ('OWNER', 'ADMIN', 'MEMBER')),
  expected_contribution_cents bigint not null default 0,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INVITED', 'LEFT', 'REMOVED')),
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

create table group_contributions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references users(id),
  amount_cents bigint not null check (amount_cents > 0),
  source_account_id uuid references accounts(id) on delete set null,
  financial_transaction_id uuid unique references transactions(id) on delete set null,
  contribution_date date not null,
  description text,
  status text not null default 'CONFIRMED' check (status in ('CONFIRMED', 'PENDING', 'CANCELLED')),
  created_at timestamptz not null default now()
);

create table group_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  description text not null,
  amount_cents bigint not null check (amount_cents > 0),
  paid_by_user_id uuid not null references users(id),
  expense_date date not null,
  category text not null,
  split_type text not null check (split_type in ('EQUAL', 'PERCENTAGE', 'SHARES', 'MANUAL')),
  payment_source text not null check (payment_source in ('GROUP_FUND', 'MEMBER')),
  source_account_id uuid references accounts(id) on delete set null,
  financial_transaction_id uuid unique references transactions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table group_expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references group_expenses(id) on delete cascade,
  user_id uuid not null references users(id),
  amount_cents bigint not null check (amount_cents >= 0),
  percentage_basis_points integer,
  shares integer,
  status text not null default 'PENDING' check (status in ('PENDING', 'SETTLED')),
  unique(expense_id, user_id)
);

create table group_fund_movements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  expense_id uuid not null unique references group_expenses(id) on delete cascade,
  type text not null check (type = 'EXPENSE'),
  amount_cents bigint not null check (amount_cents > 0),
  movement_date date not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  from_user_id uuid not null references users(id),
  to_user_id uuid not null references users(id),
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'SUGGESTED' check (status in ('SUGGESTED', 'PENDING', 'PAID', 'CANCELLED')),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  check (from_user_id <> to_user_id)
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  category_id uuid not null references categories(id),
  limit_amount_cents bigint not null check (limit_amount_cents > 0),
  period text not null default 'MONTHLY' check (period in ('MONTHLY', 'WEEKLY', 'CUSTOM')),
  reference_month text check (reference_month is null or reference_month ~ '^[0-9]{4}-[0-9]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index budgets_monthly_category_unique on budgets(user_id, category_id, reference_month) where reference_month is not null;

create table credit_card_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  credit_card_id uuid not null references credit_cards(id) on delete cascade,
  reference_month text not null check (reference_month ~ '^[0-9]{4}-[0-9]{2}$'),
  amount_cents bigint not null check (amount_cents > 0),
  account_id uuid not null references accounts(id),
  payment_date date not null,
  transaction_id uuid not null unique references transactions(id),
  created_at timestamptz not null default now()
);

create table friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references users(id) on delete cascade,
  receiver_id uuid not null references users(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender_id <> receiver_id)
);
create unique index friend_requests_pending_unique on friend_requests(sender_id, receiver_id) where status = 'PENDING';

create table friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references users(id) on delete cascade,
  user_b uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique(user_a, user_b)
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('DIRECT', 'GROUP')),
  group_id uuid references groups(id) on delete cascade,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table conversation_members (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key(conversation_id, user_id)
);
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references users(id),
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conversation_created_at on messages(conversation_id, created_at);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  action_url text,
  created_at timestamptz not null default now()
);
create index notifications_user_unread on notifications(user_id, created_at desc) where is_read = false;

-- SECURITY DEFINER helpers avoid recursive RLS checks on membership tables. They
-- expose only a boolean and always bind the caller through app.user_id.
create or replace function cofrin_is_group_member(target_group_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from group_members where group_id = target_group_id and user_id = cofrin_current_user_id() and status = 'ACTIVE') $$;
create or replace function cofrin_is_group_owner(target_group_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from groups where id = target_group_id and owner_id = cofrin_current_user_id()) $$;
create or replace function cofrin_is_conversation_member(target_conversation_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from conversation_members where conversation_id = target_conversation_id and user_id = cofrin_current_user_id()) $$;

-- The API sets SET LOCAL app.user_id for every authenticated repository transaction.
-- Its database role must not have BYPASSRLS. Service-role credentials stay server-side.
alter table profiles enable row level security;
alter table accounts enable row level security;
alter table categories enable row level security;
alter table credit_cards enable row level security;
alter table transactions enable row level security;
alter table piggy_banks enable row level security;
alter table piggy_bank_movements enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table group_contributions enable row level security;
alter table group_expenses enable row level security;
alter table group_expense_splits enable row level security;
alter table group_fund_movements enable row level security;
alter table settlements enable row level security;
alter table budgets enable row level security;
alter table credit_card_invoice_payments enable row level security;
alter table friend_requests enable row level security;
alter table friendships enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;

create policy public_profiles on profiles for select using (true);
create policy own_profile_write on profiles for all using (user_id = cofrin_current_user_id()) with check (user_id = cofrin_current_user_id());
create policy own_accounts on accounts for all using (user_id = cofrin_current_user_id()) with check (user_id = cofrin_current_user_id());
create policy own_categories on categories for all using (user_id is null or user_id = cofrin_current_user_id()) with check (user_id = cofrin_current_user_id());
create policy own_cards on credit_cards for all using (user_id = cofrin_current_user_id()) with check (user_id = cofrin_current_user_id());
create policy own_transactions on transactions for all using (user_id = cofrin_current_user_id()) with check (user_id = cofrin_current_user_id());
create policy own_piggies on piggy_banks for all using (user_id = cofrin_current_user_id()) with check (user_id = cofrin_current_user_id());
create policy own_piggy_movements on piggy_bank_movements for all using (user_id = cofrin_current_user_id()) with check (user_id = cofrin_current_user_id());
create policy own_budgets on budgets for all using (user_id = cofrin_current_user_id()) with check (user_id = cofrin_current_user_id());
create policy own_invoice_payments on credit_card_invoice_payments for all using (user_id = cofrin_current_user_id()) with check (user_id = cofrin_current_user_id());
create policy own_notifications on notifications for all using (user_id = cofrin_current_user_id()) with check (user_id = cofrin_current_user_id());

create policy member_groups on groups for select using (owner_id = cofrin_current_user_id() or cofrin_is_group_member(id));
create policy owner_groups_write on groups for all using (owner_id = cofrin_current_user_id()) with check (owner_id = cofrin_current_user_id());
create policy member_rows on group_members for select using (cofrin_is_group_member(group_id));
create policy owner_member_management on group_members for all using (cofrin_is_group_owner(group_id)) with check (cofrin_is_group_owner(group_id));
create policy member_contributions on group_contributions for all using (cofrin_is_group_member(group_id)) with check (cofrin_is_group_member(group_id));
create policy member_expenses on group_expenses for all using (cofrin_is_group_member(group_id)) with check (cofrin_is_group_member(group_id));
create policy member_splits on group_expense_splits for all using (cofrin_is_group_member((select group_id from group_expenses where id = expense_id))) with check (cofrin_is_group_member((select group_id from group_expenses where id = expense_id)));
create policy member_fund_movements on group_fund_movements for all using (cofrin_is_group_member(group_id)) with check (cofrin_is_group_member(group_id));
create policy member_settlements on settlements for all using (cofrin_is_group_member(group_id)) with check (cofrin_is_group_member(group_id));

create policy friend_request_participants on friend_requests for all using (sender_id = cofrin_current_user_id() or receiver_id = cofrin_current_user_id()) with check (sender_id = cofrin_current_user_id() or receiver_id = cofrin_current_user_id());
create policy friendship_participants on friendships for all using (user_a = cofrin_current_user_id() or user_b = cofrin_current_user_id()) with check (user_a = cofrin_current_user_id() or user_b = cofrin_current_user_id());
create policy conversation_participants on conversations for select using (cofrin_is_conversation_member(id));
create policy create_conversation on conversations for insert with check (created_by = cofrin_current_user_id());
create policy conversation_member_rows on conversation_members for select using (cofrin_is_conversation_member(conversation_id));
create policy conversation_member_management on conversation_members for all using (cofrin_is_conversation_member(conversation_id)) with check (cofrin_is_conversation_member(conversation_id) or exists (select 1 from conversations c where c.id = conversation_id and c.created_by = cofrin_current_user_id()));
create policy conversation_messages on messages for select using (cofrin_is_conversation_member(conversation_id));
create policy send_conversation_messages on messages for insert with check (sender_id = cofrin_current_user_id() and cofrin_is_conversation_member(conversation_id));
