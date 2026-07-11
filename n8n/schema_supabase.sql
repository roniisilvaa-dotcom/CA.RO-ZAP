-- =====================================================================
--  CA.RO ZAP  ·  Schema Supabase / Postgres (multi-tenant)
--  Motor de atendimento WhatsApp + IA rodando no n8n
--  Rode este script no Supabase -> SQL Editor -> New query -> Run
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1) TENANTS  (cada cliente do seu SaaS)
--    evolution_instance e a CHAVE do multi-tenant:
--    cada cliente = 1 instancia na Evolution API.
-- ---------------------------------------------------------------------
create table if not exists tenants (
    id                  uuid primary key default gen_random_uuid(),
    name                text not null,
    niche               text default '',
    plan                text default 'free',          -- free | start | business | enterprise
    status              text default 'active',        -- active | locked
    evolution_instance  text unique not null,         -- ex.: 'barbearia_cortefino'
    whatsapp_number     text default '',
    whatsapp_connected  boolean default false,
    kb_text             text default '',              -- base de conhecimento (RAG)
    kb_faqs             jsonb default '[]'::jsonb,     -- [{ "q": "...", "a": "..." }]
    kb_catalogue        text default '',              -- catalogo e precos
    sectors             jsonb default '[]'::jsonb,
    webhook_url         text default '',
    created_at          timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 2) CONTACTS  (leads / clientes de cada tenant)
--    Chave de deduplicacao: (tenant_id, phone) -> usada no upsert
-- ---------------------------------------------------------------------
create table if not exists contacts (
    id               uuid primary key default gen_random_uuid(),
    tenant_id        uuid not null references tenants(id) on delete cascade,
    name             text default '',
    phone            text not null,
    email            text default '',
    avatar_url       text default '',
    tags             jsonb default '[]'::jsonb,
    pipeline_stage   text default 'novo',              -- novo | contato | proposta | negociacao | fechado
    assigned_to      text,
    custom_fields    jsonb default '{}'::jsonb,
    lead_score       text,                             -- hot | warm | cold
    lead_reason      text,
    ai_auto_reply    boolean default true,             -- IA responde automaticamente?
    last_message_at  timestamptz default now(),
    created_at       timestamptz default now(),
    unique (tenant_id, phone)
);

-- ---------------------------------------------------------------------
-- 3) MESSAGES  (historico da conversa)
-- ---------------------------------------------------------------------
create table if not exists messages (
    id                uuid primary key default gen_random_uuid(),
    tenant_id         uuid not null references tenants(id) on delete cascade,
    contact_id        uuid not null references contacts(id) on delete cascade,
    sender            text not null,                   -- customer | agent | ai
    body              text default '',
    type              text default 'text',             -- text | image | audio | document
    media_url         text default '',
    is_internal_note  boolean default false,
    author_name       text default '',
    created_at        timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 4) NOTES  (anotacoes internas do CRM)
-- ---------------------------------------------------------------------
create table if not exists notes (
    id           uuid primary key default gen_random_uuid(),
    tenant_id    uuid not null references tenants(id) on delete cascade,
    contact_id   uuid not null references contacts(id) on delete cascade,
    body         text not null,
    author       text default 'Sistema CA.RO ZAP',
    created_at   timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 5) AUDIT_LOGS  e  WEBHOOK_LOGS
-- ---------------------------------------------------------------------
create table if not exists audit_logs (
    id          uuid primary key default gen_random_uuid(),
    tenant_id   uuid references tenants(id) on delete cascade,
    "user"      text default '',
    action      text default '',
    details     text default '',
    created_at  timestamptz default now()
);

create table if not exists webhook_logs (
    id          uuid primary key default gen_random_uuid(),
    tenant_id   uuid references tenants(id) on delete cascade,
    event       text default '',
    payload     jsonb default '{}'::jsonb,
    status      text default 'success',
    created_at  timestamptz default now()
);

-- Indices
create index if not exists idx_contacts_tenant       on contacts(tenant_id);
create index if not exists idx_contacts_tenant_phone on contacts(tenant_id, phone);
create index if not exists idx_messages_contact      on messages(contact_id, created_at desc);
create index if not exists idx_messages_tenant       on messages(tenant_id);
create index if not exists idx_tenants_instance      on tenants(evolution_instance);

-- =====================================================================
--  DADOS DE EXEMPLO (opcional) - 1 tenant de barbearia para testar
-- =====================================================================
insert into tenants (name, niche, plan, status, evolution_instance, whatsapp_number, kb_text, kb_faqs, kb_catalogue)
values (
    'Corte Fino Grooming',
    'Barbearia',
    'business',
    'active',
    'barbearia_cortefino',
    '5599999999999',
    'A Corte Fino Grooming e uma barbearia premium. Horario: seg a sab, 9h as 20h. Endereco: Rua Exemplo, 123. Trabalhamos com hora marcada.',
    '[{"q":"Voces atendem sem agendar?","a":"Trabalhamos preferencialmente com agendamento para evitar filas."},{"q":"Aceitam cartao?","a":"Sim, aceitamos debito, credito e Pix."}]'::jsonb,
    'Corte de Cabelo: R$ 60 | Barba: R$ 40 | Combo Corte + Barba: R$ 90 | Pezinho: R$ 15'
)
on conflict (evolution_instance) do nothing;

-- Fim do schema.
