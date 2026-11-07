-- Disposable local database only. Run after schemas/billing.sql with ON_ERROR_STOP.
begin;
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
-- Test-only opening balances; production schema and API have NO grants.
insert into public.billing_accounts(user_id,remaining) values ('00000000-0000-0000-0000-000000000001',10),('00000000-0000-0000-0000-000000000002',20);
set local role service_role;
do $$ begin
 if not public.record_billing_event('evt','app','PRODUCTION','{"id":"evt","app_id":"app","environment":"PRODUCTION"}',repeat('a',64)) then raise exception 'first insert missing'; end if;
 if public.record_billing_event('evt','app','PRODUCTION','{"id":"evt","app_id":"app","environment":"PRODUCTION"}',repeat('a',64)) then raise exception 'duplicate accepted as new'; end if;
 begin
   perform public.record_billing_event('evt','app','PRODUCTION','{"id":"evt","app_id":"app","environment":"PRODUCTION","changed":true}',repeat('b',64));
   raise exception 'mutated event allowed';
 exception when raise_exception then
   if sqlerrm = 'mutated event allowed' then raise; end if;
 end;
 if public.reserve_billing_credit('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',6,repeat('a',64)) <> 'reserved' then raise exception 'not reserved'; end if;
 perform public.reserve_billing_credit('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',6,repeat('a',64));
 if (select remaining from public.billing_accounts where user_id='00000000-0000-0000-0000-000000000001') <> 4 then raise exception 'retry charged again'; end if;
 begin
   perform public.reserve_billing_credit('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002',6,repeat('a',64));
   raise exception 'overspend allowed';
 exception when raise_exception then if sqlerrm <> 'insufficient credits' then raise; end if; end;
 begin
   perform public.reserve_billing_credit('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',5,repeat('a',64));
   raise exception 'conflict allowed';
 exception when raise_exception then if sqlerrm <> 'operation id conflict' then raise; end if; end;
 perform public.finish_billing_credit('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',false);
 perform public.finish_billing_credit('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',false);
 if (select remaining from public.billing_accounts where user_id='00000000-0000-0000-0000-000000000001') <> 10 then raise exception 'release not exactly once'; end if;
 begin
   perform public.finish_billing_credit('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',true);
   raise exception 'released committed';
 exception when raise_exception then if sqlerrm <> 'operation already finalized' then raise; end if; end;
 perform public.reserve_billing_credit('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003',3,repeat('c',64));
 perform public.finish_billing_credit('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003',true);
 perform public.finish_billing_credit('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003',true);
 if (select remaining from public.billing_accounts where user_id='00000000-0000-0000-0000-000000000001') <> 7 then raise exception 'commit double charged'; end if;
 if (select count(*) from public.billing_ledger) <> 3 then raise exception 'ledger count'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
 if (select count(*) from public.billing_accounts) <> 1 then raise exception 'cross-account read'; end if;
 if (select count(*) from public.billing_operations) <> 2 then raise exception 'own operations'; end if;
 begin
   update public.billing_accounts set remaining=1000;
   raise exception 'client minted credit';
 exception when insufficient_privilege then null; end;
 begin
   perform public.reserve_billing_credit('00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000005',1,repeat('a',64));
   raise exception 'client reserved';
 exception when insufficient_privilege then null; end;
 begin
   perform public.record_billing_event('forged','app','PRODUCTION','{}',repeat('a',64));
   raise exception 'client forged webhook';
 exception when insufficient_privilege then null; end;
 begin
   perform 1 from billing_private.events;
   raise exception 'private events leaked';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ begin
 if (select count(*) from public.billing_ledger) <> 0 then raise exception 'cross-user ledger read'; end if;
 if (select count(*) from public.billing_operations) <> 0 then raise exception 'cross-user operation read'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
   perform 1 from public.billing_accounts;
   raise exception 'anonymous balance read';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
