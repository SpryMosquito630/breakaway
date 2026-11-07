-- Optional DECLARATIVE schema, never applied automatically. No products or grants.
-- Include with connected.sql when generating/reviewing a LOCAL migration.
create schema if not exists billing_private;
revoke all on schema billing_private from public, anon, authenticated;
grant usage on schema billing_private to service_role;
create table billing_private.events (
 event_id text primary key check(length(event_id) between 1 and 256),
 app_id text not null check(length(app_id) between 1 and 256),
 environment text not null check(environment in ('SANDBOX','PRODUCTION')),
 payload jsonb not null check(jsonb_typeof(payload) = 'object'),
 digest text not null check(digest ~ '^[0-9a-f]{64}$'),
 received_at timestamptz not null default now(),
 check(payload->>'id' = event_id and payload->>'app_id' = app_id and payload->>'environment' = environment)
);
alter table billing_private.events enable row level security;
revoke all on billing_private.events from public, anon, authenticated;
grant select, insert on billing_private.events to service_role;

-- Empty until a reviewed server reconciler maps a verified store purchase to
-- an authenticated account. No user, signup or subscription creates credit.
create table public.billing_accounts (
 user_id uuid primary key references auth.users on delete restrict,
 remaining bigint not null check(remaining >= 0),
 updated_at timestamptz not null default now()
);
create table public.billing_operations (
 user_id uuid not null references public.billing_accounts on delete restrict,
 operation_id uuid not null,
 cost bigint not null check(cost between 1 and 1000000),
 request_digest text not null check(request_digest ~ '^[0-9a-f]{64}$'),
 status text not null check(status in ('reserved','committed','released')),
 created_at timestamptz not null default now(),
 finished_at timestamptz,
 primary key(user_id, operation_id),
 check((status = 'reserved') = (finished_at is null))
);
create table public.billing_ledger (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.billing_accounts on delete restrict,
 operation_id uuid not null,
 kind text not null check(kind in ('reserve','release')),
 delta bigint not null,
 created_at timestamptz not null default now(),
 unique(user_id, operation_id, kind),
 foreign key(user_id, operation_id) references public.billing_operations on delete restrict,
 check((kind = 'reserve' and delta < 0) or (kind = 'release' and delta > 0))
);
alter table public.billing_accounts enable row level security;
alter table public.billing_operations enable row level security;
alter table public.billing_ledger enable row level security;
revoke all on public.billing_accounts, public.billing_operations, public.billing_ledger from public, anon, authenticated;
grant select on public.billing_accounts, public.billing_operations, public.billing_ledger to authenticated;
grant select, update on public.billing_accounts, public.billing_operations to service_role;
grant insert on public.billing_operations, public.billing_ledger to service_role;
grant select on public.billing_ledger to service_role;
create policy billing_accounts_own_read on public.billing_accounts for select to authenticated using ((select auth.uid()) = user_id);
create policy billing_operations_own_read on public.billing_operations for select to authenticated using ((select auth.uid()) = user_id);
create policy billing_ledger_own_read on public.billing_ledger for select to authenticated using ((select auth.uid()) = user_id);

-- SECURITY INVOKER: service_role privileges only, no public bypass-RLS helper.
-- Host must authenticate Authorization+HMAC before calling this RPC.
create function public.record_billing_event(p_event_id text, p_app_id text, p_environment text, p_payload jsonb, p_digest text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare old_event billing_private.events%rowtype;
begin
 if p_payload->>'id' is distinct from p_event_id or p_payload->>'app_id' is distinct from p_app_id
    or p_payload->>'environment' is distinct from p_environment then
   raise exception 'event fields mismatch';
 end if;
 insert into billing_private.events(event_id, app_id, environment, payload, digest)
 values(p_event_id,p_app_id,p_environment,p_payload,p_digest) on conflict(event_id) do nothing;
 if found then return true; end if;
 select * into strict old_event from billing_private.events where event_id = p_event_id;
 if old_event.payload is distinct from p_payload or old_event.digest <> p_digest then
   raise exception 'event id reused with different content';
 end if;
 return false;
end $$;

-- The host obtains p_user_id from verified auth.getUser() / server JWT validation;
-- never forward a user_id/cost from client JSON. p_digest binds immutable inputs.
-- Account-row locking serializes concurrent operations and prevents overspend.
create function public.reserve_billing_credit(p_user_id uuid, p_operation_id uuid, p_cost bigint, p_digest text)
returns text language plpgsql security invoker set search_path = '' as $$
declare balance bigint; op public.billing_operations%rowtype;
begin
 if p_cost is null or p_cost not between 1 and 1000000 or p_digest is null or p_digest !~ '^[0-9a-f]{64}$' then
   raise exception 'invalid reservation';
 end if;
 select remaining into balance from public.billing_accounts where user_id = p_user_id for update;
 if not found then raise exception 'credit account unavailable'; end if;
 select * into op from public.billing_operations where user_id=p_user_id and operation_id=p_operation_id;
 if found then
   if op.cost <> p_cost or op.request_digest <> p_digest then raise exception 'operation id conflict'; end if;
   return op.status;
 end if;
 if balance < p_cost then raise exception 'insufficient credits'; end if;
 insert into public.billing_operations(user_id,operation_id,cost,request_digest,status)
 values(p_user_id,p_operation_id,p_cost,p_digest,'reserved');
 update public.billing_accounts set remaining=remaining-p_cost, updated_at=now() where user_id=p_user_id;
 insert into public.billing_ledger(user_id,operation_id,kind,delta) values(p_user_id,p_operation_id,'reserve',-p_cost);
 return 'reserved';
end $$;

-- Commit consumes the existing reservation; release returns its original cost
-- exactly once. Terminal transitions cannot be reversed. A retried committed
-- operation must serve its stored result, never re-run a charged analysis.
create function public.finish_billing_credit(p_user_id uuid, p_operation_id uuid, p_commit boolean)
returns text language plpgsql security invoker set search_path = '' as $$
declare op public.billing_operations%rowtype; target text;
begin
 if p_commit is null then raise exception 'missing outcome'; end if;
 perform 1 from public.billing_accounts where user_id=p_user_id for update;
 if not found then raise exception 'credit account unavailable'; end if;
 select * into strict op from public.billing_operations where user_id=p_user_id and operation_id=p_operation_id;
 target := case when p_commit then 'committed' else 'released' end;
 if op.status <> 'reserved' then
   if op.status <> target then raise exception 'operation already finalized'; end if;
   return op.status;
 end if;
 if not p_commit then
   update public.billing_accounts set remaining=remaining+op.cost, updated_at=now() where user_id=p_user_id;
   insert into public.billing_ledger(user_id,operation_id,kind,delta) values(p_user_id,p_operation_id,'release',op.cost);
 end if;
 update public.billing_operations set status=target, finished_at=now() where user_id=p_user_id and operation_id=p_operation_id;
 return target;
end $$;
revoke all on function public.record_billing_event(text,text,text,jsonb,text), public.reserve_billing_credit(uuid,uuid,bigint,text), public.finish_billing_credit(uuid,uuid,boolean) from public, anon, authenticated;
grant execute on function public.record_billing_event(text,text,text,jsonb,text), public.reserve_billing_credit(uuid,uuid,bigint,text), public.finish_billing_credit(uuid,uuid,boolean) to service_role;
