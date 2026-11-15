-- Run after connected.sql in a disposable database; transactions roll back fixtures.
begin;
insert into auth.users(id) values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222'), ('33333333-3333-3333-3333-333333333333');
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
insert into public.training_backups(user_id,revision,payload) values(auth.uid(),1,'{"version":1}');
insert into public.community_profiles(user_id,alias) values(auth.uid(),'First');
update public.community_profiles set alias = 'Updated nickname' where user_id = auth.uid();
do $$ begin
 begin update public.community_profiles set practice_points = 999 where user_id = auth.uid(); raise exception 'Client score mutation allowed'; exception when insufficient_privilege then null; end;
 begin update public.community_profiles set leaderboard_opt_in = true where user_id = auth.uid(); raise exception 'Standings opt-in allowed'; exception when insufficient_privilege then null; end;
 begin insert into public.community_profiles(user_id,alias,practice_points) values(auth.uid(),'Spoof',999); raise exception 'Client score insert allowed'; exception when insufficient_privilege then null; end;
end $$;

insert into public.community_spaces(id,owner_id,title,kind) values('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',auth.uid(),'Private team','team');
do $$ begin
 begin insert into public.space_members(space_id,user_id) values('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','33333333-3333-3333-3333-333333333333'); raise exception 'Owner invited a non-friend'; exception when insufficient_privilege then null; end;
end $$;
insert into public.friend_requests(sender_id,recipient_id) values(auth.uid(),'22222222-2222-2222-2222-222222222222');
insert into public.player_reports(reporter_id,subject_id,reason) values(auth.uid(),'22222222-2222-2222-2222-222222222222','Test private report');
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
do $$ begin
 if exists(select 1 from public.training_backups) then raise exception 'Cross-user backup leak'; end if;
 if exists(select 1 from public.community_profiles) then raise exception 'Private alias leak'; end if;
 if exists(select 1 from public.community_spaces) then raise exception 'Private team leak'; end if;
 if exists(select 1 from public.player_reports) then raise exception 'Private report leak'; end if;
 begin insert into public.training_backups(user_id,revision,payload) values('33333333-3333-3333-3333-333333333333',1,'{"version":1}'); raise exception 'Cross-user backup insert allowed'; exception when insufficient_privilege then null; end;
 begin insert into public.space_members(space_id,user_id) values('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',auth.uid()); raise exception 'Self-join allowed'; exception when insufficient_privilege then null; end;
end $$;
update public.friend_requests set accepted = true where recipient_id = auth.uid();
do $$ begin if not exists(select 1 from public.community_profiles) then raise exception 'Accepted friend alias unavailable'; end if; end $$;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
insert into public.space_members(space_id,user_id) values('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222');
insert into public.space_entries(id,space_id,author_id,kind,body,options) values('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',auth.uid(),'poll','When?','["Morning","Evening"]');
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
do $$ begin if not exists(select 1 from public.community_spaces) then raise exception 'Invited team unavailable'; end if; end $$;
insert into public.poll_votes(entry_id,user_id,option) values('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',auth.uid(),1);
do $$ begin
 begin update public.poll_votes set option = 9 where user_id = auth.uid(); raise exception 'Invalid poll option allowed'; exception when insufficient_privilege then null; end;
end $$;
insert into public.player_blocks(user_id,blocked_id) values(auth.uid(),'11111111-1111-1111-1111-111111111111');
do $$ begin
 if exists(select 1 from public.community_spaces) then raise exception 'Blocked owner team leak'; end if;
 if exists(select 1 from public.community_profiles) then raise exception 'Blocked alias leak'; end if;
 if exists(select 1 from public.friend_requests) then raise exception 'Blocked request leak'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform * from public.training_backups; raise exception 'Anonymous backup access allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
