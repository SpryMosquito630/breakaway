import { useEffect, useRef, useState } from "react";
import { Alert, Platform, Text, TextInput, View } from "react-native";
import { Button, Page, Title, useTheme } from "../components/ui";
import type { AppData, Drill } from "../domain/model";
import { drills } from "../data/drills";
import { useApp } from "../state/AppState";
import { requireClient } from "../connected/client";
import { connectedAccessAllowed } from "../connected/access";
import { useConnection } from "../connected/useConnection";
import {
  assertUnchangedTraining,
  buildTrainingPayload,
  parseTrainingPayload,
} from "../connected/sync";
import * as api from "../connected/service";
function confirm(title: string, body: string, action: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${body}`)) action();
  } else
    Alert.alert(title, body, [
      { text: "Cancel", style: "cancel" },
      { text: "Continue", onPress: action },
    ]);
}
function Field({
  label,
  value,
  onChange,
  secret = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  secret?: boolean;
}) {
  const { C, s } = useTheme();
  return (
    <View style={{ gap: 5 }}>
      <Text style={s.small}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secret}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          color: C.ink,
          backgroundColor: C.soft,
          borderColor: C.lineStrong,
          borderWidth: 1,
          borderRadius: 8,
          padding: 14,
          minHeight: 48,
        }}
      />
    </View>
  );
}
function Disconnected() {
  const { s } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.h2}>Online features are not connected in this build</Text>
      <Text style={s.body}>
        Local training continues to work. Accounts, cloud backups and private community
        spaces require a configured Supabase project. No training has been uploaded.
      </Text>
    </View>
  );
}
export type AccountScreenProps = {
  data: AppData;
  onRestore?: (data: AppData) => void;
  catalog?: Drill[];
};
export function AccountScreen({ data, onRestore, catalog = drills }: AccountScreenProps) {
  const connection = useConnection();
  const { s } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [backup, setBackup] = useState<api.Backup | null>(null);
  const [checked, setChecked] = useState(false);
  const latest = useRef(data);
  latest.current = data;
  useEffect(() => {
    setBackup(null);
    setChecked(false);
    setMessage("");
  }, [connection.user?.id]);
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await work();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "The request failed. Try again.");
    } finally {
      setBusy(false);
    }
  }
  async function auth(signUp: boolean) {
    if (!email.trim() || !password) throw Error("Enter your email and password.");
    const result = signUp
      ? await requireClient().auth.signUp({ email: email.trim(), password })
      : await requireClient().auth.signInWithPassword({ email: email.trim(), password });
    if (result.error) throw result.error;
    setPassword("");
    setMessage(
      signUp && !result.data.session
        ? "Check your email to verify your account, then sign in here."
        : "Signed in. Cloud sync is always your choice.",
    );
    setChecked(false);
    setBackup(null);
  }
  if (!connectedAccessAllowed())
    return (
      <Page>
        <Title
          title="Accounts unavailable"
          body="Accounts require an age answer of 13 or older. You can update your answer in training preferences."
        />
      </Page>
    );
  return (
    <Page>
      <Title
        title="Account & cloud"
        body="Optional account. Training stays on this device until you choose to upload."
      />
      {!connection.configured ? (
        <Disconnected />
      ) : connection.loading ? (
        <Text style={s.body}>Checking your account…</Text>
      ) : !connection.user ? (
        <View style={{ gap: 12 }}>
          <Field label="Email" value={email} onChange={setEmail} />
          <Field label="Password" value={password} onChange={setPassword} secret />
          <Button
            label="Sign in"
            disabled={busy}
            onPress={() => void run(() => auth(false))}
          />
          <Button
            label="Create account"
            kind="secondary"
            disabled={busy}
            onPress={() => void run(() => auth(true))}
          />
          <Button
            label="Resend verification email"
            kind="secondary"
            disabled={busy || !email.trim()}
            onPress={() =>
              void run(async () => {
                const { error } = await requireClient().auth.resend({
                  type: "signup",
                  email: email.trim(),
                });
                if (error) throw error;
                setMessage("If verification is pending, check your email.");
              })
            }
          />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Text style={s.body}>Signed in as {connection.user.email}</Text>
          <Text style={s.body}>
            Backups include your training profile, plan, custom drills, sessions,
            benchmarks and assessments. Active practice, GPS routes, food photos and
            replay videos are excluded.
          </Text>
          <Button
            label="Check cloud backup"
            disabled={busy}
            kind="secondary"
            onPress={() =>
              void run(async () => {
                setBackup(await api.loadBackup());
                setChecked(true);
                setMessage("Cloud backup checked.");
              })
            }
          />
          <Text style={s.body}>
            {checked
              ? backup
                ? `Cloud revision ${backup.revision} · ${new Date(backup.updated_at).toLocaleString()}`
                : "No cloud training backup yet."
              : "Check the cloud before uploading or downloading."}
          </Text>
          <Button
            label="Upload this device’s training"
            disabled={busy || !checked}
            onPress={() =>
              confirm(
                "Upload training?",
                "This replaces the checked cloud training backup. Your device data stays unchanged.",
                () =>
                  void run(async () => {
                    const next = await api.uploadBackup(
                      buildTrainingPayload(latest.current),
                      backup?.revision ?? null,
                    );
                    setBackup(next);
                    setMessage("Training uploaded.");
                  }),
              )
            }
          />
          <Button
            label="Download cloud training"
            kind="secondary"
            disabled={busy || !checked || !backup || !!data.active || !onRestore}
            onPress={() =>
              confirm(
                "Replace local training?",
                "Cloud training will replace your local plan and history. Upload any local changes you want to keep first. Active practices must be finished or discarded.",
                () =>
                  void run(async () => {
                    const captured = JSON.stringify(buildTrainingPayload(latest.current));
                    const remote = await api.loadBackup();
                    if (!remote)
                      throw Error("The cloud backup was removed. Refresh and try again.");
                    const restored = parseTrainingPayload(remote.payload, catalog);
                    assertUnchangedTraining(latest.current, captured);
                    onRestore?.(restored);
                    setBackup(remote);
                    setMessage("Cloud training restored.");
                  }),
              )
            }
          />
          {data.active ? (
            <Text style={s.body}>
              Finish or discard your active practice before downloading.
            </Text>
          ) : null}
          <Button
            label="Delete cloud training backup"
            kind="danger"
            disabled={busy || !backup}
            onPress={() =>
              confirm(
                "Delete cloud backup?",
                "Your training on this device stays saved.",
                () =>
                  void run(async () => {
                    await api.deleteBackup();
                    setBackup(null);
                    setChecked(true);
                    setMessage("Cloud training backup deleted.");
                  }),
              )
            }
          />
          <Button
            label="Sign out"
            kind="secondary"
            disabled={busy}
            onPress={() =>
              void run(async () => {
                const { error } = await requireClient().auth.signOut();
                if (error) throw error;
                setBackup(null);
                setChecked(false);
                setMessage("Signed out. Local training remains saved.");
              })
            }
          />
        </View>
      )}
      {message || connection.error ? (
        <Text accessibilityLiveRegion="polite" style={s.body}>
          {message || connection.error}
        </Text>
      ) : null}
    </Page>
  );
}
export function CommunityScreen() {
  const connection = useConnection();
  const { data } = useApp();
  const { s } = useTheme();
  const [community, setCommunity] = useState<Awaited<
    ReturnType<typeof api.loadCommunity>
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [alias, setAlias] = useState("");
  const [friendId, setFriendId] = useState("");
  const [reason, setReason] = useState("");
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [selected, setSelected] = useState<api.Space | null>(null);
  const [entries, setEntries] = useState<api.SpaceEntry[]>([]);
  const [body, setBody] = useState("");
  const [date, setDate] = useState("");
  const [options, setOptions] = useState("");
  const [tallies, setTallies] = useState<Record<string, { option: number }[]>>({});
  useEffect(() => {
    setCommunity(null);
    setSelected(null);
    setEntries([]);
    setAlias("");
    setMessage("");
  }, [connection.user?.id]);
  async function refresh() {
    const result = await api.loadCommunity();
    setCommunity(result);
    setAlias(result.profile?.alias ?? "");
  }
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await work();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "The request failed.");
    } finally {
      setBusy(false);
    }
  }
  async function open(space: api.Space) {
    setSelected(space);
    setEntries(await api.loadEntries(space.id));
    setTallies({});
  }
  if (!connectedAccessAllowed())
    return (
      <Page>
        <Title
          title="Community unavailable"
          body="Community requires an age answer of 13 or older. You can update your answer in training preferences."
        />
      </Page>
    );
  return (
    <Page>
      <Title
        title="Community"
        body="Developer preview: private invitations and shared practice."
      />
      {!connection.configured ? (
        <Disconnected />
      ) : connection.loading ? (
        <Text style={s.body}>Checking your account…</Text>
      ) : !connection.user ? (
        <Text style={s.body}>
          Sign in under Account & cloud to use community features.
        </Text>
      ) : (
        <View style={{ gap: 16 }}>
          <Text style={s.body}>
            Use a nickname. Share your player ID only with people you know; there is no
            public player directory.
          </Text>
          <Text selectable style={s.body}>
            Your private player ID: {connection.user.id}
          </Text>
          <Button
            label="Refresh community"
            kind="secondary"
            disabled={busy}
            onPress={() => void run(refresh)}
          />
          <Field label="Display alias" value={alias} onChange={setAlias} />
          <Button
            label="Save alias"
            disabled={busy}
            onPress={() =>
              void run(async () => {
                await api.saveIdentity(alias);
                await refresh();
              })
            }
          />
          <Text style={s.body}>
            Standings are disabled. No authoritative scoring service is configured.
          </Text>
          <Text style={s.h2}>Friends & safety</Text>
          <Field
            label="Friend’s private player ID"
            value={friendId}
            onChange={setFriendId}
          />
          <Button
            label="Send friend request"
            disabled={busy}
            onPress={() =>
              void run(async () => {
                await api.requestFriend(friendId.trim());
                await refresh();
              })
            }
          />
          {community?.requests.map((r) => (
            <View key={r.id} style={{ gap: 8 }}>
              <Text selectable style={s.body}>
                {r.sender_id === community.id ? r.recipient_id : r.sender_id} ·{" "}
                {r.accepted ? "Connected" : "Pending"}
              </Text>
              {!r.accepted && r.recipient_id === community.id ? (
                <Button
                  label="Accept request"
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      await api.acceptFriend(r.id);
                      await refresh();
                    })
                  }
                />
              ) : null}
              <Button
                label={r.accepted ? "Remove friend" : "Decline / cancel request"}
                kind="secondary"
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    await api.removeFriend(r.id);
                    await refresh();
                  })
                }
              />
            </View>
          ))}
          <Field label="Report reason" value={reason} onChange={setReason} />
          <Button
            label="Report the entered player ID"
            kind="secondary"
            disabled={busy || !friendId.trim()}
            onPress={() =>
              void run(async () => {
                await api.reportPlayer(friendId.trim(), reason);
                setMessage("Report submitted privately for moderation.");
              })
            }
          />
          <Button
            label="Block the entered player ID"
            kind="danger"
            disabled={busy || !friendId.trim()}
            onPress={() =>
              confirm(
                "Block player?",
                "Their profile, requests and messages will be hidden from you. A shared space owner can also remove members.",
                () =>
                  void run(async () => {
                    await api.blockPlayer(friendId.trim());
                    await refresh();
                    setSelected(null);
                    setEntries([]);
                    setMessage("Player blocked.");
                  }),
              )
            }
          />
          <Button
            label="Unblock the entered player ID"
            kind="secondary"
            disabled={busy || !friendId.trim()}
            onPress={() =>
              void run(async () => {
                await api.unblockPlayer(friendId.trim());
                await refresh();
                setMessage("Player unblocked.");
              })
            }
          />
          <Text style={s.h2}>Teams & shared challenges</Text>
          <Field label="Space title" value={title} onChange={setTitle} />
          <Field label="Shared goal" value={goal} onChange={setGoal} />
          {(["team", "challenge"] as const).map((kind) => (
            <Button
              key={kind}
              label={`Create private ${kind}`}
              kind="secondary"
              disabled={busy || !title.trim()}
              onPress={() =>
                void run(async () => {
                  await api.createSpace(title, kind, goal);
                  setTitle("");
                  await refresh();
                })
              }
            />
          ))}
          {community?.spaces.map((space) => (
            <Button
              key={space.id}
              label={`${space.title} · ${space.kind}`}
              kind="secondary"
              disabled={busy}
              onPress={() => void run(() => open(space))}
            />
          ))}
          {selected ? (
            <View style={{ gap: 12 }}>
              <Text style={s.h2}>{selected.title}</Text>
              <Text style={s.body}>{selected.goal}</Text>
              <Button
                label="Refresh shared space"
                kind="secondary"
                disabled={busy}
                onPress={() => void run(() => open(selected))}
              />
              {selected.owner_id === connection.user.id ? (
                <>
                  <Text style={s.body}>
                    Use the private player ID entered above to manage this space.
                  </Text>
                  <Button
                    label="Invite entered player"
                    disabled={busy || !friendId.trim()}
                    onPress={() =>
                      void run(async () => {
                        await api.inviteMember(selected.id, friendId.trim());
                        setMessage("Player added to this private space.");
                      })
                    }
                  />
                  <Button
                    label="Remove entered player"
                    kind="danger"
                    disabled={busy || !friendId.trim()}
                    onPress={() =>
                      void run(async () => {
                        await api.removeMember(selected.id, friendId.trim());
                        setMessage("Player removed from this space.");
                      })
                    }
                  />
                </>
              ) : (
                <Button
                  label="Leave this space"
                  kind="secondary"
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      await api.removeMember(selected.id, connection.user!.id);
                      setSelected(null);
                      await refresh();
                    })
                  }
                />
              )}
              {selected.kind === "challenge" ? (
                <Button
                  label="Share a practice check-in"
                  kind="secondary"
                  disabled={busy}
                  onPress={() =>
                    confirm(
                      "Share practice count?",
                      "This posts your self-reported completed practice count to this private challenge.",
                      () =>
                        void run(async () => {
                          await api.postEntry(
                            selected.id,
                            "message",
                            `Practice check-in: ${data.history.filter((h) => h.completed).length} completed sessions on my device (self-reported).`,
                          );
                          await open(selected);
                        }),
                    )
                  }
                />
              ) : null}
              <Field
                label="Message, event title or poll question"
                value={body}
                onChange={setBody}
              />
              <Field
                label="Event time with timezone (2026-11-08T15:00:00-08:00)"
                value={date}
                onChange={setDate}
              />
              <Field
                label="Poll choices, separated by commas"
                value={options}
                onChange={setOptions}
              />
              {(["message", "event", "poll"] as const).map((kind) => (
                <Button
                  key={kind}
                  label={`Post ${kind}`}
                  kind="secondary"
                  disabled={busy || !body.trim()}
                  onPress={() =>
                    void run(async () => {
                      await api.postEntry(
                        selected.id,
                        kind,
                        body,
                        date,
                        options
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      );
                      setBody("");
                      await open(selected);
                    })
                  }
                />
              ))}
              {entries.map((entry) => (
                <View key={entry.id} style={{ gap: 8 }}>
                  <Text style={s.body}>{entry.body}</Text>
                  {entry.author_id === connection.user?.id ||
                  selected.owner_id === connection.user?.id ? (
                    <Button
                      label="Remove update"
                      kind="danger"
                      disabled={busy}
                      onPress={() =>
                        confirm(
                          "Remove update?",
                          "This removes the shared message, event or poll.",
                          () =>
                            void run(async () => {
                              await api.deleteEntry(entry.id);
                              await open(selected);
                            }),
                        )
                      }
                    />
                  ) : null}
                  <Text style={s.small}>
                    {entry.kind} · {new Date(entry.created_at).toLocaleString()}
                    {entry.starts_at
                      ? ` · ${new Date(entry.starts_at).toLocaleString()}`
                      : ""}
                  </Text>
                  {entry.kind === "poll" ? (
                    <>
                      {entry.options.map((choice, i) => (
                        <Button
                          key={i}
                          label={`${choice}${tallies[entry.id] ? ` · ${tallies[entry.id].filter((v) => v.option === i).length} votes` : ""}`}
                          kind="secondary"
                          disabled={busy}
                          onPress={() =>
                            void run(async () => {
                              await api.vote(entry.id, i);
                              const counts = await api.loadVotes(entry.id);
                              setTallies((v) => ({ ...v, [entry.id]: counts }));
                              setMessage("Vote saved.");
                            })
                          }
                        />
                      ))}
                      <Button
                        label="Refresh poll results"
                        disabled={busy}
                        kind="secondary"
                        onPress={() =>
                          void run(async () => {
                            const counts = await api.loadVotes(entry.id);
                            setTallies((v) => ({ ...v, [entry.id]: counts }));
                          })
                        }
                      />
                    </>
                  ) : null}
                </View>
              ))}
              {!entries.length ? (
                <Text style={s.body}>No shared updates yet.</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      )}
      {message || connection.error ? (
        <Text style={s.body} accessibilityLiveRegion="polite">
          {message || connection.error}
        </Text>
      ) : null}
    </Page>
  );
}
