# Optional connected features

The application remains fully local when these build variables are absent:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Only HTTPS and frontend publishable keys are accepted. Never use secret or service-role keys in Expo. Restart the Expo build after configuring variables. Configure email verification in Supabase Auth; signup without a session displays verification instructions. Native sessions use Expo SecureStore; web sessions use the Supabase SDK's browser storage. All cloud actions require a verified server user through `auth.getUser()`.

## Database setup

`schemas/connected.sql` is a declarative desired schema, not an applied migration. No hosted database has been provisioned or modified. Install/configure the Supabase CLI, inspect `supabase --help` and each subcommand's current help, initialize a local stack, and configure `schema_paths` to include this file. Generate a migration from the local declarative schema, review it and apply it locally before a hosted deployment. Run `tests/connected_rls.sql` in a disposable/local database with `ON_ERROR_STOP` and run the Supabase database advisors. Do not use production for these fixture tests. No remote Auth, REST or email flow has been integration tested without a project.

Tables use explicit authenticated grants and RLS, with no anonymous reads. Private helper functions exist in a non-exposed schema with locked search paths and explicit grants to avoid recursive membership/block policies. Keep `app_private` out of Data API exposed schemas. Moderators are assigned by an administrator through `app_private.moderators`, never user metadata. Reports are visible only to their author and these moderators. Administrators must provide an operational moderation workflow before a public launch. Space owners can remove members and shared updates; users can leave spaces, remove friends, block/unblock players and submit reports.

There is no public player search. Friends require a player ID shared out of band. Team/challenge owners can invite only accepted friends (or themselves) using private player IDs; knowing a stranger’s UUID does not grant invitation rights. SQL enforces this independently of client validation. Aliases remain private unless players opt into standings or accept friends. Standings explicitly count **self-reported completed practice sessions**, not verified performance or fraud-resistant scores. A production competition requires server-authoritative evidence and separate abuse/rate controls.

## Backup behavior

Uploads/downloads happen only after explicit user action. Training payloads allowlist profile, plan, custom drills, favorites/playlists, training preferences/readiness, history, benchmarks and assessments. Active practices, replay videos, food photos, routes and other local stores are excluded. Uploads compare the last checked cloud revision and reject concurrent changes. Download confirms replacement, rejects active practice and rejects edits made while the download is pending. Download uses the existing sanitized restore parser including incoming custom drill support. Cloud training can be deleted separately without deleting local training.

Future schema fields are not automatically included in cloud sync: update the explicit allowlist, privacy explanation and tests together. Local team tools and these private cloud spaces are separate unless the user explicitly copies information between them.

## Documentation verified

- https://supabase.com/changelog.md (2026-11-06; CLI v3 breaking change reviewed, CLI not installed here)
- https://supabase.com/docs/guides/auth/quickstarts/react-native
- https://supabase.com/docs/guides/database/postgres/row-level-security

Client tests: `npx tsx --test tests/connected.test.ts`; types: `npm run typecheck`.

Database verification (2026-11-06): schema applied successfully to disposable PostgreSQL 17.11 with auth role/UID stubs. The SQL allow/deny suite passed: own backup writes, denied cross-user backup reads/writes, private aliases/teams/reports, friend acceptance visibility, invitation membership, poll option validation, blocking and anonymous grant denial. This validates PostgreSQL policy behavior, not hosted Supabase Auth/REST configuration. The test container was removed afterward.
