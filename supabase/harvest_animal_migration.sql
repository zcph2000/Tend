-- =============================================================================
-- HARVEST LOGS — tilføj kunde-info og enhed
-- =============================================================================

alter table harvest_logs
  add column if not exists customer_type text
    check (customer_type in ('privat', 'gårdsalg', 'restaurant', 'butik', 'andet')),
  add column if not exists vat_included  boolean default true,
  add column if not exists quantity_unit text default 'kg'
    check (quantity_unit in ('kg', 'stk', 'liter', 'bundt'));


-- =============================================================================
-- ANIMAL PRODUCT LOGS — æg, slagtedyr, mælk, uld, honning mv.
-- =============================================================================

create table if not exists animal_product_logs (
  id              uuid primary key default gen_random_uuid(),
  farm_id         uuid references farms(id) on delete cascade not null,
  log_date        date not null default current_date,
  product_type    text not null
                    check (product_type in ('æg', 'slagtedyr', 'mælk', 'uld', 'honning', 'andet')),
  animal_species  text,                       -- fx "Høns", "Sortbroget Landrace"
  quantity        numeric not null,
  unit            text not null default 'stk'
                    check (unit in ('stk', 'kg', 'liter')),
  sold_to_type    text
                    check (sold_to_type in ('privat', 'gårdsalg', 'restaurant', 'butik', 'ikke_solgt', 'andet')),
  sold_to_name    text,
  price_per_unit  numeric,
  vat_included    boolean default true,
  notes           text,
  created_at      timestamptz default now()
);

create index if not exists animal_product_logs_farm_id_idx on animal_product_logs(farm_id);
create index if not exists animal_product_logs_date_idx    on animal_product_logs(log_date);

alter table animal_product_logs enable row level security;

create policy "Brugere ser egne dyrlogs" on animal_product_logs for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne dyrlogs" on animal_product_logs for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne dyrlogs" on animal_product_logs for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne dyrlogs" on animal_product_logs for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);
