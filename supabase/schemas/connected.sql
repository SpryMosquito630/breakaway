-- Declarative desired schema. Review and generate a migration with your configured Supabase CLI.
create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;
create table public.training_backups (
 user_id uuid primary key references auth.users on delete cascade,
 revision bigint not null check (revision > 0), updated_at timestamptz not null default now(),
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 2000000 and payload->>'version' = '1')
);
create table public.community_profiles (
 user_id uuid primary key references auth.users on delete cascade,
 alias text not null check (length(trim(alias)) between 1 and 32),
 leaderboard_opt_in boolean not null default false,
 practice_points integer not null default 0 check (practice_points between 0 and 1000000)
);
create table public.player_blocks (
 user_id uuid not null references auth.users on delete cascade,
 blocked_id uuid not null references auth.users on delete cascade,
 primary key(user_id, blocked_id), check(user_id <> blocked_id)
);
create table public.friend_requests (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users on delete cascade,
 recipient_id uuid not null references auth.users on delete cascade,
 accepted boolean not null default false,
 unique(sender_id,recipient_id), check(sender_id <> recipient_id)
);
create table public.community_spaces (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users on delete cascade,
 title text not null check(length(trim(title)) between 1 and 80),
 kind text not null check(kind in ('team','challenge')),
 goal text not null default '' check(length(goal) <= 1000)
);
create table public.space_members (
 space_id uuid not null references public.community_spaces on delete cascade,
 user_id uuid not null references auth.users on delete cascade, primary key(space_id,user_id)
);
create table public.space_entries (
 id uuid primary key default gen_random_uuid(), space_id uuid not null references public.community_spaces on delete cascade,
 author_id uuid not null references auth.users on delete cascade,
 kind text not null check(kind in ('message','event','poll')),
 body text not null check(length(trim(body)) between 1 and 2000),
 starts_at timestamptz, options jsonb not null default '[]', created_at timestamptz not null default now(),
 check(jsonb_typeof(options) = 'array' and jsonb_array_length(options) <= 10),
 check((kind = 'event') = (starts_at is not null)),
 check((kind = 'poll' and jsonb_array_length(options) between 2 and 10) or (kind <> 'poll' and options = '[]'))
);
create table public.poll_votes (
 entry_id uuid not null references public.space_entries on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 option integer not null check(option between 0 and 9), primary key(entry_id,user_id)
);
create table public.player_reports (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references auth.users on delete cascade,
 subject_id uuid not null references auth.users on delete cascade,
 reason text not null check(length(trim(reason)) between 5 and 2000), created_at timestamptz not null default now()
);
-- Roles are managed only by a database administrator, never by user metadata or clients.
create table app_private.moderators (user_id uuid primary key references auth.users on delete cascade);
alter table app_private.moderators enable row level security;
revoke all on app_private.moderators from public, anon, authenticated;
-- These narrowly scoped helpers deliberately bypass RLS to avoid recursive policies.
-- They live outside exposed schemas, lock search_path, require a real auth.uid(), and cannot enumerate rows.
create function app_private.blocked(other_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is null or exists(select 1 from public.player_blocks b where (b.user_id = auth.uid() and b.blocked_id = other_id) or (b.blocked_id = auth.uid() and b.user_id = other_id));
$$;
create function app_private.space_owner(sid uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from public.community_spaces s where s.id = sid and s.owner_id = auth.uid());
$$;
create function app_private.space_access(sid uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from public.community_spaces s where s.id = sid and not app_private.blocked(s.owner_id) and (s.owner_id = auth.uid() or exists(select 1 from public.space_members m where m.space_id = sid and m.user_id = auth.uid())));
$$;
create function app_private.is_moderator() returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from app_private.moderators where user_id = auth.uid());
$$;
create function app_private.friend(other_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from public.friend_requests f where f.accepted and ((f.sender_id = auth.uid() and f.recipient_id = other_id) or (f.recipient_id = auth.uid() and f.sender_id = other_id)));
$$;
revoke all on function app_private.blocked(uuid), app_private.space_owner(uuid), app_private.space_access(uuid), app_private.is_moderator(), app_private.friend(uuid) from public, anon;
grant execute on function app_private.blocked(uuid), app_private.space_owner(uuid), app_private.space_access(uuid), app_private.is_moderator(), app_private.friend(uuid) to authenticated;
-- Explicit grants: no anonymous Data API access; all exposed tables enable RLS.
alter table public.training_backups enable row level security;
alter table public.community_profiles enable row level security;
alter table public.player_blocks enable row level security;
alter table public.friend_requests enable row level security;
alter table public.community_spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.space_entries enable row level security;
alter table public.poll_votes enable row level security;
alter table public.player_reports enable row level security;
revoke all on public.training_backups, public.community_profiles, public.player_blocks, public.friend_requests, public.community_spaces, public.space_members, public.space_entries, public.poll_votes, public.player_reports from public, anon, authenticated;
grant select,insert,update,delete on public.training_backups, public.player_blocks, public.community_spaces, public.poll_votes to authenticated;
-- Standings are disabled: clients can edit their alias, never points or opt-in.
grant select,delete on public.community_profiles to authenticated;
grant insert(user_id,alias), update(alias) on public.community_profiles to authenticated;
grant select,insert,delete on public.friend_requests, public.space_members, public.space_entries to authenticated;
grant update(accepted) on public.friend_requests to authenticated;
grant select,insert on public.player_reports to authenticated;
create policy backup_owner on public.training_backups to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy profiles_read on public.community_profiles for select to authenticated using (user_id = (select auth.uid()) or (not app_private.blocked(user_id) and app_private.friend(user_id)));
create policy profiles_insert on public.community_profiles for insert to authenticated with check(user_id = (select auth.uid()) and not leaderboard_opt_in and practice_points = 0);
create policy profiles_update on public.community_profiles for update to authenticated using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()));
create policy profiles_delete on public.community_profiles for delete to authenticated using(user_id = (select auth.uid()));
create policy blocks_owner on public.player_blocks to authenticated using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()));
create policy friends_read on public.friend_requests for select to authenticated using((sender_id = (select auth.uid()) or recipient_id = (select auth.uid())) and not app_private.blocked(case when sender_id = (select auth.uid()) then recipient_id else sender_id end));
create policy friends_insert on public.friend_requests for insert to authenticated with check(sender_id = (select auth.uid()) and not accepted and not app_private.blocked(recipient_id));
create policy friends_accept on public.friend_requests for update to authenticated using(recipient_id = (select auth.uid()) and not app_private.blocked(sender_id)) with check(recipient_id = (select auth.uid()) and not app_private.blocked(sender_id));
create policy friends_delete on public.friend_requests for delete to authenticated using(sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
create policy spaces_read on public.community_spaces for select to authenticated using(app_private.space_access(id));
create policy spaces_insert on public.community_spaces for insert to authenticated with check(owner_id = (select auth.uid()));
create policy spaces_update on public.community_spaces for update to authenticated using(owner_id = (select auth.uid())) with check(owner_id = (select auth.uid()));
create policy spaces_delete on public.community_spaces for delete to authenticated using(owner_id = (select auth.uid()));
create policy members_read on public.space_members for select to authenticated using(app_private.space_access(space_id));
create policy members_insert on public.space_members for insert to authenticated with check(app_private.space_owner(space_id) and (user_id = (select auth.uid()) or app_private.friend(user_id)) and not app_private.blocked(user_id));
create policy members_delete on public.space_members for delete to authenticated using(app_private.space_owner(space_id) or user_id = (select auth.uid()));
create policy entries_read on public.space_entries for select to authenticated using(app_private.space_access(space_id) and not app_private.blocked(author_id));
create policy entries_insert on public.space_entries for insert to authenticated with check(author_id = (select auth.uid()) and app_private.space_access(space_id));
create policy entries_delete on public.space_entries for delete to authenticated using(author_id = (select auth.uid()) or app_private.space_owner(space_id) or app_private.is_moderator());
create policy votes_read on public.poll_votes for select to authenticated using(exists(select 1 from public.space_entries e where e.id = entry_id and app_private.space_access(e.space_id)) and not app_private.blocked(user_id));
create policy votes_insert on public.poll_votes for insert to authenticated with check(user_id = (select auth.uid()) and exists(select 1 from public.space_entries e where e.id = entry_id and e.kind = 'poll' and option < jsonb_array_length(e.options) and app_private.space_access(e.space_id)));
create policy votes_update on public.poll_votes for update to authenticated using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()) and exists(select 1 from public.space_entries e where e.id = entry_id and e.kind = 'poll' and option < jsonb_array_length(e.options) and app_private.space_access(e.space_id)));
create policy votes_delete on public.poll_votes for delete to authenticated using(user_id = (select auth.uid()));
create policy reports_read on public.player_reports for select to authenticated using(reporter_id = (select auth.uid()) or app_private.is_moderator());
create policy reports_insert on public.player_reports for insert to authenticated with check(reporter_id = (select auth.uid()));
create index friends_recipient on public.friend_requests(recipient_id);
create index members_user on public.space_members(user_id);
create index entries_space on public.space_entries(space_id,created_at);
create index blocks_target on public.player_blocks(blocked_id);
