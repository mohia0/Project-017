create table
  public.clients (
    id uuid not null default gen_random_uuid (),
    company_name text not null,
    contact_person text not null,
    email text not null,
    phone text null,
    address text null,
    tax_number text null,
    notes text null,
    created_at timestamp with time zone not null default now(),
    constraint clients_pkey primary key (id)
  ) tablespace pg_default;

create table
  public.proposals (
    id uuid not null default gen_random_uuid (),
    client_id uuid not null,
    title text not null,
    status text not null default 'Draft'::text,
    amount numeric not null default 0,
    issue_date date null,
    due_date date null,
    notes text null,
    blocks jsonb not null default '[]'::jsonb,
    created_at timestamp with time zone not null default now(),
    constraint proposals_pkey primary key (id),
    constraint proposals_client_id_fkey foreign key (client_id) references clients (id) on delete cascade
  ) tablespace pg_default;
