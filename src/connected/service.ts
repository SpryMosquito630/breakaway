import { requireClient } from './client';
export type Backup = { user_id: string; revision: number; updated_at: string; payload: Record<string, unknown> };
export type Identity = { user_id: string; alias: string; leaderboard_opt_in: boolean; practice_points: number };
export type FriendRequest = { id: string; sender_id: string; recipient_id: string; accepted: boolean };
export type Space = { id: string; owner_id: string; title: string; kind: 'team' | 'challenge'; goal: string };
export type SpaceEntry = { id: string; space_id: string; author_id: string; kind: 'message' | 'event' | 'poll'; body: string; starts_at: string | null; options: string[]; created_at: string };
export async function currentUserId() {
  const { data, error } = await requireClient().auth.getUser();
  if (error) throw error;
  if (!data.user) throw Error('Sign in first.');
  return data.user.id;
}
export async function loadBackup(): Promise<Backup | null> {
  const userId = await currentUserId();
  const { data, error } = await requireClient().from('training_backups').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}
export async function uploadBackup(payload: Record<string, unknown>, expectedRevision: number | null): Promise<Backup> {
  const userId = await currentUserId();
  const client = requireClient();
  const query = expectedRevision === null
    ? client.from('training_backups').insert({ user_id: userId, revision: 1, payload })
    : client.from('training_backups').update({ revision: expectedRevision + 1, payload, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('revision', expectedRevision);
  const { data, error } = await query.select().maybeSingle();
  if (error?.code === '23505' || (!error && !data)) throw Error('Cloud backup changed on another device. Refresh before uploading.');
  if (error) throw error;
  return data;
}
export async function deleteBackup() {
  const id = await currentUserId();
  const { error } = await requireClient().from('training_backups').delete().eq('user_id', id);
  if (error) throw error;
}
export async function loadCommunity() {
  const client = requireClient(); const id = await currentUserId();
  const results = await Promise.all([
    client.from('community_profiles').select('*').eq('user_id', id).maybeSingle(),
    client.from('community_profiles').select('*').eq('leaderboard_opt_in', true).order('practice_points', { ascending: false }).limit(30),
    client.from('friend_requests').select('*').or(`sender_id.eq.${id},recipient_id.eq.${id}`),
    client.from('community_spaces').select('*').limit(50),
  ]);
  for (const result of results) if (result.error) throw result.error;
  return { id, profile: results[0].data as Identity | null, leaders: (results[1].data ?? []) as Identity[], requests: (results[2].data ?? []) as FriendRequest[], spaces: (results[3].data ?? []) as Space[] };
}
export async function saveIdentity(alias: string, optIn: boolean, points: number) {
  const id = await currentUserId();
  if (!alias.trim() || alias.trim().length > 32) throw Error('Choose an alias between 1 and 32 characters.');
  const { error } = await requireClient().from('community_profiles').upsert({ user_id: id, alias: alias.trim(), leaderboard_opt_in: optIn, practice_points: Math.max(0, Math.min(1000000, Math.floor(points))) });
  if (error) throw error;
}
export async function requestFriend(recipientId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(recipientId)) throw Error('Enter the private player ID shared by your friend.');
  const { error } = await requireClient().from('friend_requests').insert({ sender_id: await currentUserId(), recipient_id: recipientId });
  if (error) throw error;
}
export async function acceptFriend(id: string) {
  const { error } = await requireClient().from('friend_requests').update({ accepted: true }).eq('id', id).eq('recipient_id', await currentUserId());
  if (error) throw error;
}
export async function removeFriend(id: string) {
  const { error } = await requireClient().from('friend_requests').delete().eq('id', id); if (error) throw error;
}
export async function blockPlayer(blockedId: string) {
  const { error } = await requireClient().from('player_blocks').upsert({ user_id: await currentUserId(), blocked_id: blockedId }); if (error) throw error;
}
export async function reportPlayer(subjectId: string, reason: string) {
  if (reason.trim().length < 5) throw Error('Describe the concern in at least five characters.');
  const { error } = await requireClient().from('player_reports').insert({ reporter_id: await currentUserId(), subject_id: subjectId, reason: reason.trim() }); if (error) throw error;
}
export async function createSpace(title: string, kind: Space['kind'], goal: string) {
  const { error } = await requireClient().from('community_spaces').insert({ owner_id: await currentUserId(), title: title.trim(), kind, goal: goal.trim() }); if (error) throw error;
}
export async function inviteMember(spaceId: string, userId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) throw Error('Enter a valid private player ID.');
  const client = requireClient();
  const ownId = await currentUserId();
  if (userId !== ownId) {
    const { data, error } = await client.from('friend_requests').select('id').eq('accepted', true)
      .or(`and(sender_id.eq.${ownId},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${ownId})`).limit(1);
    if (error) throw error;
    if (!data?.length) throw Error('Add and accept this friend before inviting them.');
  }
  const { error } = await client.from('space_members').insert({ space_id: spaceId, user_id: userId });
  if (error?.code === '42501') throw Error('Add and accept this friend before inviting them. The space owner must send the invitation.');
  if (error) throw error;
}
export async function removeMember(spaceId: string, userId: string) {
  const { error } = await requireClient().from('space_members').delete().eq('space_id', spaceId).eq('user_id', userId); if (error) throw error;
}
export async function loadEntries(spaceId: string): Promise<SpaceEntry[]> {
  const { data, error } = await requireClient().from('space_entries').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }).limit(100); if (error) throw error; return data ?? [];
}
export async function postEntry(spaceId: string, kind: SpaceEntry['kind'], body: string, startsAt?: string, options: string[] = []) {
  if (!body.trim()) throw Error('Enter a message, event title or poll question.');
  if (kind === 'event' && (!startsAt || !Number.isFinite(Date.parse(startsAt)))) throw Error('Enter a valid event date and time.');
  if (kind === 'poll' && (options.length < 2 || options.some(x => !x.trim()))) throw Error('Add at least two poll choices.');
  const { error } = await requireClient().from('space_entries').insert({ space_id: spaceId, author_id: await currentUserId(), kind, body: body.trim(), starts_at: kind === 'event' ? startsAt : null, options: kind === 'poll' ? options : [] }); if (error) throw error;
}
export async function vote(entryId: string, option: number) {
  const { error } = await requireClient().from('poll_votes').upsert({ entry_id: entryId, user_id: await currentUserId(), option }); if (error) throw error;
}
export async function loadVotes(entryId: string): Promise<{ option: number }[]> {
  const { data, error } = await requireClient().from('poll_votes').select('option').eq('entry_id', entryId); if (error) throw error; return data ?? [];
}
export async function unblockPlayer(blockedId: string) {
  const { error } = await requireClient().from('player_blocks').delete().eq('user_id', await currentUserId()).eq('blocked_id', blockedId); if (error) throw error;
}
export async function deleteEntry(entryId: string) {
  const { error } = await requireClient().from('space_entries').delete().eq('id', entryId); if (error) throw error;
}
