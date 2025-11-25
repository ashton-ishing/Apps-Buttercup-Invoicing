-- 1. Clients Table
create table clients (
  id text primary key default gen_random_uuid()::text, -- Using text to match current app usage, ideally uuid
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  "contactName" text, -- Quoted to preserve camelCase from app
  email text
);

-- 2. Invoices Table
create table invoices (
  id text primary key default gen_random_uuid()::text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  "clientId" text references clients(id),
  "invoiceNumber" text,
  "issueDate" date,
  "dueDate" date,
  status text default 'Draft',
  total numeric,
  subtotal numeric,
  tax numeric,
  "includeGst" boolean default false,
  "lineItems" jsonb -- Store line items as JSON
);

-- 3. Recurring Invoices Table
create table recurring_invoices (
  id text primary key default gen_random_uuid()::text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  "clientId" text references clients(id),
  "startDate" date,
  frequency text,
  "paymentTerms" int,
  "nextRunDate" date,
  status text default 'Active',
  total numeric,
  subtotal numeric,
  tax numeric,
  "includeGst" boolean default false,
  "lineItems" jsonb
);

-- 4. Expenses Table
create table expenses (
  id text primary key default gen_random_uuid()::text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  category text,
  description text,
  amount numeric,
  date date,
  "isPaid" boolean default false
);

-- 5. Transactions Table (Optional, for reconciliation)
create table transactions (
  id text primary key default gen_random_uuid()::text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  date date,
  amount numeric,
  type text,
  description text,
  reconciled boolean default false
);

-- 6. User Settings Table (for email template and Google Script URL)
create table user_settings (
  id text primary key default gen_random_uuid()::text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  email_template text,
  google_script_url text
);

-- 7. Enable RLS (Security) - Allow authenticated users to read/write
alter table clients enable row level security;
alter table invoices enable row level security;
alter table recurring_invoices enable row level security;
alter table expenses enable row level security;
alter table transactions enable row level security;
alter table user_settings enable row level security;

-- Simple policy: Allow all operations for authenticated users
-- (Since you are the only user for now)
create policy "Enable all for users" on clients for all using (true);
create policy "Enable all for users" on invoices for all using (true);
create policy "Enable all for users" on recurring_invoices for all using (true);
create policy "Enable all for users" on expenses for all using (true);
create policy "Enable all for users" on transactions for all using (true);
create policy "Enable all for users" on user_settings for all using (true);

-- Auto-update updated_at timestamp for user_settings
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_user_settings_updated_at
before update on user_settings
for each row
execute function update_updated_at_column();

