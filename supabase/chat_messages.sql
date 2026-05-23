-- Chat-beskeder til rådgiveren (cross-device persistence)
create table if not exists chat_messages (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  farm_id    uuid references farms(id) on delete cascade not null,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz default now()
);

-- Indeks til hurtig hentning af samtalehistorik
create index if not exists chat_messages_user_farm_idx
  on chat_messages (user_id, farm_id, created_at);

-- RLS
alter table chat_messages enable row level security;

create policy "Brugere kan se egne chat-beskeder"
  on chat_messages for select
  using (auth.uid() = user_id);

create policy "Brugere kan indsætte egne chat-beskeder"
  on chat_messages for insert
  with check (auth.uid() = user_id);

create policy "Brugere kan slette egne chat-beskeder"
  on chat_messages for delete
  using (auth.uid() = user_id);
