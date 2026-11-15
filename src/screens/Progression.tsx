import { Text, View } from "react-native";
import { Award, Flag, GitBranch, Shield, Trophy } from "lucide-react-native";
import { useApp } from "../state/AppState";
import { useTheme } from "../theme/ThemeProvider";
import { Button, Choice, Page, SettingRow, Title } from "../components/ui";
import { drills } from "../data/drills";
import type { Drill } from "../domain/model";
import { deriveProgression, latestPersonalBest } from "../progression/engine";
import { seasonPreferences } from "../progression/store";

function useProgression() {
  const app = useApp();
  const catalog = (app as typeof app & { catalog?: Drill[] }).catalog ?? drills;
  return { ...deriveProgression(app.data, catalog), data: app.data };
}
function Meter({
  value,
  target,
  label,
}: {
  value: number;
  target: number;
  label: string;
}) {
  const { C, s } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value} of ${target}`}
      style={{ gap: 8 }}
    >
      <View style={s.row}>
        <Text style={s.small}>{label}</Text>
        <Text style={s.h3}>
          {value} / {target}
        </Text>
      </View>
      <View
        style={{
          height: 6,
          backgroundColor: C.line,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: 6,
            width: `${Math.min(100, (value / target) * 100)}%`,
            backgroundColor: C.green,
          }}
        />
      </View>
    </View>
  );
}
export function ProgressionSummary({ navigation }: { navigation: any }) {
  const p = useProgression();
  const best = latestPersonalBest(p.data);
  const { C, s } = useTheme();
  return (
    <View style={{ gap: 16 }}>
      <View style={[s.card, { backgroundColor: C.pitchSoft, gap: 12 }]}>
        <View style={s.row}>
          <Text style={[s.h2, { flex: 1 }]}>
            Level {p.level} · {p.rank}
          </Text>
          <Shield size={22} color={C.green} />
        </View>
        <Meter
          label={`${p.xp} total practice XP`}
          value={p.xp - p.levelStart}
          target={p.levelEnd - p.levelStart}
        />
        <Text style={s.small}>
          XP records completed practice and tests. Your ability scores come from
          assessments.
        </Text>
      </View>
      {best ? (
        <View accessibilityLiveRegion="polite" style={{ gap: 4 }}>
          <Text style={s.h3}>★ {best.title}</Text>
          <Text style={s.small}>
            {best.detail} · {new Date(best.date).toLocaleDateString()}
          </Text>
        </View>
      ) : null}
      <View style={s.row}>
        <Text style={[s.h3, { flex: 1 }]}>
          {p.weekDays} practice {p.weekDays === 1 ? "day" : "days"} this week
        </Text>
        <Text style={s.small}>{p.streak.current} day streak</Text>
      </View>
      <View>
        <SettingRow
          label="Challenges & badges"
          value={`${p.challenges.filter((c) => c.value >= c.target).length} of ${p.challenges.length} challenges complete`}
          icon={Trophy}
          onPress={() => navigation.navigate("Challenges")}
        />
        <SettingRow
          label="Practice skill tree"
          value="Milestones earned through actual practice"
          icon={GitBranch}
          onPress={() => navigation.navigate("SkillTree")}
        />
        <SettingRow
          label="Season goals"
          value={`${p.seasonDays} practice days this month`}
          icon={Flag}
          onPress={() => navigation.navigate("Seasons")}
        />
      </View>
    </View>
  );
}
export function Challenges() {
  const p = useProgression();
  const { C, s } = useTheme();
  return (
    <Page>
      <Title
        title="Challenges & badges"
        body="Progress updates automatically from saved practice. There is nothing to claim twice."
      />
      {p.challenges.map((c) => (
        <View
          key={c.id}
          style={{
            gap: 8,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderColor: C.line,
          }}
        >
          <Text style={s.h3}>
            {c.value >= c.target ? "✓ " : ""}
            {c.title}
          </Text>
          <Text style={s.body}>{c.detail}</Text>
          <Meter
            label={c.value >= c.target ? "Complete" : "Progress"}
            value={Math.min(c.value, c.target)}
            target={c.target}
          />
        </View>
      ))}
      <Text style={s.small}>
        Daily challenges reset at local midnight. Weekly challenges run Monday–Sunday.
        Challenges do not award bonus XP.
      </Text>
      <Text style={s.h2}>Your badges</Text>
      {p.badges.map((b) => (
        <View
          key={b.id}
          style={{
            flexDirection: "row",
            gap: 12,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderColor: C.line,
          }}
        >
          <Award size={24} color={b.earned ? C.green : C.muted} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.h3}>
              {b.title} · {b.earned ? "Earned" : "Locked"}
            </Text>
            <Text style={s.small}>{b.detail}</Text>
          </View>
        </View>
      ))}
      <Text style={s.h2}>How XP works</Text>
      <Text style={s.body}>
        Each completed timed drill earns 10 XP plus 2 XP per full minute, up to 200
        practice XP per day. A saved test earns 5 XP, once per test protocol per day.
        Skipped drills, partial blocks and sessions without drill records earn no XP.
      </Text>
      <Text style={s.small}>
        Your {p.xp} XP = {p.practiceXP} practice + {p.testXP} tests. XP is reconstructed
        from your local records.
      </Text>
    </Page>
  );
}
export function SkillTree() {
  const p = useProgression();
  const { C, s } = useTheme();
  return (
    <Page>
      <Title
        title="Practice skill tree"
        body="Unlock practice milestones by returning and exploring. These milestones describe experience, not measured ability."
      />
      {p.branches.map((branch) => (
        <View key={branch.skill} style={{ gap: 16, paddingVertical: 12 }}>
          <Text style={s.h2}>{branch.skill}</Text>
          <Text style={s.small}>
            {branch.count} completed drills · {branch.days} practice days ·{" "}
            {branch.variety} different drills
          </Text>
          {branch.nodes.map((node, index) => {
            const earned = node.value >= node.target;
            const open =
              index === 0 ||
              branch.nodes[index - 1].value >= branch.nodes[index - 1].target;
            return (
              <View key={node.title} style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ width: 28, minHeight: 48, alignItems: "center" }}>
                  <Text style={[s.h3, { color: earned ? C.green : C.muted }]}>
                    {earned ? "✓" : open ? "○" : "·"}
                  </Text>
                  {index < 3 ? (
                    <View style={{ width: 1, flex: 1, backgroundColor: C.line }} />
                  ) : null}
                </View>
                <View style={{ flex: 1, gap: 4, paddingBottom: 16 }}>
                  <Text style={s.h3}>
                    {node.title} · {earned ? "Unlocked" : open ? "In progress" : "Locked"}
                  </Text>
                  <Text style={s.small}>{node.detail}</Text>
                  <Text style={s.small}>
                    {Math.min(node.value, node.target)}/{node.target}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}
      <Text style={s.small}>
        All training drills remain available. Unlocks acknowledge completed practice; they
        never restrict safe training choices.
      </Text>
    </Page>
  );
}
export function Seasons() {
  const p = useProgression();
  const { s } = useTheme();
  const preferences = seasonPreferences.useStore();
  const target = preferences.data.goals[p.seasonKey] ?? 8;
  const seasonName = new Date(`${p.seasonKey}-01T12:00:00`).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" },
  );
  const previous = [...new Set(p.events.map((e) => e.day.slice(0, 7)))]
    .filter((key) => key !== p.seasonKey)
    .sort()
    .reverse();
  return (
    <Page>
      <Title
        title={seasonName}
        body="Each calendar month is a fresh season. Your lifetime XP and test results stay with you."
      />
      <Text style={s.h2}>
        {p.seasonDays >= target ? "Season goal reached" : "Build your monthly rhythm"}
      </Text>
      <Meter label="Practice days this season" value={p.seasonDays} target={target} />
      <Text style={s.small}>
        {p.season.length} completed drills ·{" "}
        {Math.floor(p.season.reduce((n, e) => n + e.seconds, 0) / 60)} completed-drill
        minutes this month
      </Text>
      <Text style={s.h2}>Choose your season goal</Text>
      <Text style={s.body}>Count practice days, with room for rest and recovery.</Text>
      {[4, 8, 12, 16].map((goal) => (
        <Choice
          key={goal}
          label={`${goal} practice days`}
          selected={target === goal}
          onPress={() => {
            if (!preferences.ready || goal === target) return;
            void preferences.update((current) => ({
              ...current,
              goals: { ...current.goals, [p.seasonKey]: goal },
            }));
          }}
        />
      ))}
      {!preferences.ready ? <Text style={s.small}>Loading your season goal…</Text> : null}
      {preferences.error ? (
        <>
          <Text style={s.body}>{preferences.error}</Text>
          <Button
            label="Retry saving goal"
            kind="secondary"
            onPress={preferences.retry}
          />
        </>
      ) : null}
      {previous.length ? <Text style={s.h2}>Past seasons</Text> : null}
      {previous.map((key) => {
        const events = p.events.filter((e) => e.day.startsWith(key));
        const days = new Set(events.map((e) => e.day)).size;
        return (
          <View key={key} style={s.row}>
            <Text style={s.h3}>
              {new Date(`${key}-01T12:00:00`).toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              })}
            </Text>
            <Text style={s.small}>
              {days} days · {events.length} drills
              {preferences.data.goals[key]
                ? ` · goal ${preferences.data.goals[key]}`
                : ""}
            </Text>
          </View>
        );
      })}
    </Page>
  );
}
