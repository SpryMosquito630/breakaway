import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Text, TextInput, View } from 'react-native';
import { Button, Page, Title } from '../components/ui';
import { useTheme } from '../theme/ThemeProvider';
import { analysisCredits } from '../billing/credits';
import { normalizeCreatorCode } from '../billing/policy';
import { purchaseMembership, readMembership, restoreMembership, submitCreatorAttribution, watchMembership, type MembershipSnapshot } from '../billing/revenueCat';
export function MembershipScreen() {
  const { s, C } = useTheme();
  const [snapshot, setSnapshot] = useState<MembershipSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [creator, setCreator] = useState('');
  const [credits, setCredits] = useState('Checking credit service…');
  const operation = useRef(false);
  const refresh = useCallback(async () => {
    if (operation.current) return;
    operation.current = true; setBusy(true);
    try { setSnapshot(await readMembership()); } finally { operation.current = false; setBusy(false); }
  }, []);
  useEffect(() => {
    let alive = true; let unsubscribe = () => {};
    void refresh();
    void analysisCredits.readBalance().then(value => { if (alive) setCredits(value.available ? `${value.remaining} server-confirmed analysis credits` : value.reason); });
    void watchMembership(() => { if (alive) void refresh(); }).then(cleanup => { if (alive) unsubscribe = cleanup; else cleanup(); });
    const subscription = AppState.addEventListener('change', state => { if (alive && state === 'active') void refresh(); });
    return () => { alive = false; unsubscribe(); subscription.remove(); };
  }, [refresh]);
  async function transact(task: () => Promise<{ active: boolean; message: string }>) {
    if (operation.current) return;
    operation.current = true; setBusy(true); setNotice('Waiting for the store…');
    try {
      const result = await task();
      setSnapshot(value => value ? { ...value, active: result.active } : value);
      setNotice(result.message);
    } finally { operation.current = false; setBusy(false); }
  }
  async function attribute() {
    if (operation.current) return;
    operation.current = true; setBusy(true);
    try { setNotice(await submitCreatorAttribution(creator)); }
    finally { operation.current = false; setBusy(false); }
  }
  function open(url: string) { void Linking.openURL(url).catch(() => setNotice('This link could not be opened. Try again when a browser is available.')); }
  return <Page>
    <Title eyebrow="MEMBERSHIP" title="Keep training your way" body="Local training, progress, replay and coaching tools remain available without a subscription. Membership never buys OVR, XP or athletic ability." />
    <View style={s.card}>
      <Text style={s.h2}>{snapshot?.active ? 'Membership active' : 'Free local training'}</Text>
      <Text style={s.body}>{snapshot?.message || (snapshot ? 'Membership status is confirmed by the store.' : 'Checking store availability…')}</Text>
      <Button label={busy ? 'Checking…' : 'Refresh membership'} kind="secondary" disabled={busy} onPress={() => { setNotice(''); void refresh(); }} />
    </View>
    {snapshot?.available && !snapshot.active ? snapshot.products.map(product => <View key={product.id} style={s.card}>
      <Text style={s.h2}>{product.title}</Text>
      <Text style={s.body}>{product.description}</Text>
      <Text style={s.h2}>{product.price}</Text>
      <Text style={s.small}>Recurring subscription. The store confirmation shows renewal terms, any eligible trial and the final price. Manage or cancel through your store account.</Text>
      <Button label={`Continue · ${product.price}`} disabled={busy} onPress={() => void transact(() => purchaseMembership(product.id))} />
    </View>) : null}
    {snapshot?.available ? <Button label="Restore purchases" kind="secondary" disabled={busy} onPress={() => void transact(restoreMembership)} /> : null}
    <View style={s.card}>
      <Text style={s.h2}>Analysis credits</Text>
      <Text style={s.body}>{credits}</Text>
      <Text style={s.small}>Credits are separate from membership and training progress. No credits are charged or granted on this screen.</Text>
    </View>
    <View style={s.card}>
      <Text style={s.h2}>Creator attribution</Text>
      <Text style={s.body}>Have a creator code? You can submit it as attribution when the store is connected. A code does not apply a discount or unlock access.</Text>
      <TextInput accessibilityLabel="Creator attribution code" value={creator} onChangeText={setCreator} maxLength={24} autoCapitalize="characters" autoCorrect={false} placeholder="Creator code" placeholderTextColor={C.muted} style={[s.input, { color: C.ink }]} />
      <Button label="Submit attribution" kind="secondary" disabled={busy || !snapshot?.available || !normalizeCreatorCode(creator)} onPress={() => void attribute()} />
    </View>
    {snapshot?.config ? <View style={{ gap: 10 }}>
      <Button label="Membership terms" kind="secondary" onPress={() => open(snapshot.config!.termsUrl)} />
      <Button label="Privacy policy" kind="secondary" onPress={() => open(snapshot.config!.privacyUrl)} />
    </View> : null}
    {notice ? <Text accessibilityLiveRegion="polite" style={s.body}>{notice}</Text> : null}
  </Page>;
}
export default MembershipScreen;
