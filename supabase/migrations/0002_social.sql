-- Social identity and conversations. Profile email remains in auth.users and is never public.
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists username text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists avatar_url text;
create unique index if not exists profiles_username_lower_unique on profiles (lower(username));
create table if not exists friend_requests (
  id uuid primary key default gen_random_uuid(), sender_id uuid not null references profiles(id), receiver_id uuid not null references profiles(id),
  status text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','DECLINED','CANCELLED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (sender_id <> receiver_id)
);
create unique index if not exists friend_requests_pending_unique on friend_requests(sender_id, receiver_id) where status='PENDING';
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(), user_a uuid not null references profiles(id), user_b uuid not null references profiles(id),
  created_at timestamptz not null default now(), check (user_a < user_b), unique(user_a, user_b)
);
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(), type text not null check (type in ('DIRECT','GROUP')), group_id uuid references groups(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists conversation_members (
  conversation_id uuid not null references conversations(id) on delete cascade, user_id uuid not null references profiles(id),
  joined_at timestamptz not null default now(), last_read_at timestamptz, primary key(conversation_id, user_id)
);
create table if not exists messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id), content text not null check (char_length(trim(content)) between 1 and 2000), created_at timestamptz not null default now()
);
create index if not exists messages_conversation_created_at on messages(conversation_id, created_at);
alter table friend_requests enable row level security; alter table friendships enable row level security; alter table conversations enable row level security; alter table conversation_members enable row level security; alter table messages enable row level security;
create policy "friend request participants" on friend_requests for all using (sender_id=auth.uid() or receiver_id=auth.uid()) with check (sender_id=auth.uid() or receiver_id=auth.uid());
create policy "friendship participants" on friendships for select using (user_a=auth.uid() or user_b=auth.uid());
create policy "conversation members" on conversations for select using (exists(select 1 from conversation_members where conversation_members.conversation_id=conversations.id and conversation_members.user_id=auth.uid()));
create policy "conversation member rows" on conversation_members for select using (user_id=auth.uid() or exists(select 1 from conversation_members self where self.conversation_id=conversation_members.conversation_id and self.user_id=auth.uid()));
create policy "conversation messages" on messages for all using (exists(select 1 from conversation_members where conversation_members.conversation_id=messages.conversation_id and conversation_members.user_id=auth.uid())) with check (sender_id=auth.uid());
