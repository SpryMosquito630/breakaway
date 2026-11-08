import { haptic } from "./src/utils/haptics";
import { lazy, Suspense, useEffect, useState } from "react";
import { DEVELOPER_FEATURES } from "./src/config/features";
import { setConnectedAgeBand } from "./src/connected/access";
import { AccessibilityInfo, ActivityIndicator, Text, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { BarlowCondensed_600SemiBold } from "@expo-google-fonts/barlow-condensed/600SemiBold";
import { BarlowCondensed_700Bold } from "@expo-google-fonts/barlow-condensed/700Bold";
import { BarlowCondensed_800ExtraBold } from "@expo-google-fonts/barlow-condensed/800ExtraBold";
import { Archivo_400Regular } from "@expo-google-fonts/archivo/400Regular";
import { Archivo_500Medium } from "@expo-google-fonts/archivo/500Medium";
import { Archivo_700Bold } from "@expo-google-fonts/archivo/700Bold";
import { Archivo_600SemiBold } from "@expo-google-fonts/archivo/600SemiBold";
import { IBMPlexMono_400Regular } from "@expo-google-fonts/ibm-plex-mono/400Regular";
import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono/500Medium";
import {
  CalendarDays,
  TrafficCone,
  ChartNoAxesCombined,
  Settings2,
} from "lucide-react-native";
import { AppProvider, useApp } from "./src/state/AppState";
import { Onboarding, ReplayOnboarding } from "./src/screens/Onboarding";
import { Today, Plan } from "./src/screens/Home";
import { Library, Detail, Replace } from "./src/screens/Library";
import { Practice, Recap } from "./src/screens/Practice";
import { Assessment } from "./src/screens/Assessment";
import {
  Progress,
  Benchmark,
  SkillProfileScreen,
  TouchProgress,
  PracticeMilestones,
  SessionHistory,
} from "./src/screens/Progress";
import { Settings, EditPreferences } from "./src/screens/Settings";
import { Link, IconButton, useTheme } from "./src/components/ui";
import { ThemeProvider } from "./src/theme/ThemeProvider";
import { RemindersProvider } from "./src/notifications/RemindersProvider";
import { TrainingPlanner, CustomDrillEditor, Playlists } from "./src/screens/Training";
import { Challenges, SkillTree, Seasons } from "./src/screens/Progression";
function developerScreen(load: () => Promise<{ default: React.ComponentType<any> }>) {
  const Screen = lazy(load);
  return (props: any) => (
    <Suspense
      fallback={<ActivityIndicator accessibilityLabel="Loading developer tool" />}
    >
      <Screen {...props} />
    </Suspense>
  );
}
const Replay = developerScreen(() =>
  import("./src/screens/DeveloperScreens").then((m) => ({ default: m.Replay })),
);
const AthleteFitnessScreen = developerScreen(() =>
  import("./src/screens/DeveloperScreens").then((m) => ({
    default: m.AthleteFitnessScreen,
  })),
);
const AthleteRunsScreen = developerScreen(() =>
  import("./src/screens/DeveloperScreens").then((m) => ({
    default: m.AthleteRunsScreen,
  })),
);
const AthleteFuelScreen = developerScreen(() =>
  import("./src/screens/DeveloperScreens").then((m) => ({
    default: m.AthleteFuelScreen,
  })),
);
const AthleteRecoveryScreen = developerScreen(() =>
  import("./src/screens/DeveloperScreens").then((m) => ({
    default: m.AthleteRecoveryScreen,
  })),
);
const AthleteMatchesScreen = developerScreen(() =>
  import("./src/screens/DeveloperScreens").then((m) => ({
    default: m.AthleteMatchesScreen,
  })),
);
const CommunityScreen = developerScreen(() =>
  import("./src/screens/DeveloperScreens").then((m) => ({ default: m.CommunityScreen })),
);
const AccountRoute = developerScreen(() =>
  import("./src/screens/DeveloperScreens").then((m) => ({ default: m.AccountRoute })),
);
const ToolsHome = developerScreen(() =>
  import("./src/screens/DeveloperScreens").then((m) => ({ default: m.ToolsHome })),
);
const ToolCategory = developerScreen(() =>
  import("./src/screens/DeveloperScreens").then((m) => ({ default: m.ToolCategory })),
);
const CoachWorkspace = developerScreen(() =>
  import("./src/screens/DeveloperScreens").then((m) => ({ default: m.CoachWorkspace })),
);
const CoachSessionBuilder = developerScreen(() =>
  import("./src/screens/DeveloperScreens").then((m) => ({
    default: m.CoachSessionBuilder,
  })),
);
const CoachSessionDetail = developerScreen(() =>
  import("./src/screens/DeveloperScreens").then((m) => ({
    default: m.CoachSessionDetail,
  })),
);
const TeamWorkspace = developerScreen(() =>
  import("./src/screens/DeveloperScreens").then((m) => ({ default: m.TeamWorkspace })),
);
const CoachAI = developerScreen(() =>
  import("./src/screens/DeveloperScreens").then((m) => ({ default: m.CoachAI })),
);
const VideoFeedback = developerScreen(() =>
  import("./src/screens/DeveloperScreens").then((m) => ({ default: m.VideoFeedback })),
);
const PoseReview = developerScreen(() =>
  import("./src/screens/DeveloperScreens").then((m) => ({ default: m.PoseReview })),
);
const MembershipScreen = developerScreen(() =>
  import("./src/screens/DeveloperScreens").then((m) => ({ default: m.MembershipScreen })),
);
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const icons = {
  Today: CalendarDays,
  Drills: TrafficCone,
  Progress: ChartNoAxesCombined,
};
function Main({ navigation }: { navigation: any }) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenListeners={({ navigation }) => ({
        tabPress: () => {
          if (!navigation.isFocused()) haptic("selection");
        },
      })}
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: C.bg },
        headerShadowVisible: false,
        headerTitleAlign: "left",
        headerTitleStyle: {
          fontFamily: "Archivo_600SemiBold",
          fontSize: 24,
          color: C.ink,
        },
        headerRight: () => (
          <IconButton
            label="Settings"
            icon={Settings2}
            onPress={() => navigation.navigate("Settings")}
          />
        ),
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor: C.line,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarItemStyle: { minHeight: 48 },
        tabBarLabelStyle: {
          fontFamily: "Archivo_600SemiBold",
          fontSize: 11,
          lineHeight: 14,
        },
        tabBarIcon: ({ color, size }) => {
          const Icon = icons[route.name as keyof typeof icons];
          return <Icon color={color} size={size} strokeWidth={2} />;
        },
      })}
    >
      <Tab.Screen
        name="Today"
        component={Today}
        options={{ title: "Train", tabBarLabel: "Train" }}
      />
      <Tab.Screen name="Drills" component={Library} />
      <Tab.Screen name="Progress" component={Progress} />
    </Tab.Navigator>
  );
}
function Shell() {
  const { C, s, isDark } = useTheme();
  const { data, loading, recovery, error, retry } = useApp();
  setConnectedAgeBand(data.profile.ageBand);
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => sub.remove();
  }, []);
  if (loading)
    return (
      <View style={[s.page, { justifyContent: "center", alignItems: "center", gap: 16 }]}>
        <Text
          style={{
            fontFamily: "BarlowCondensed_800ExtraBold",
            fontSize: 32,
            color: C.green,
          }}
        >
          Breakaway
        </Text>
        <ActivityIndicator color={C.green} accessibilityLabel="Loading your saved plan" />
      </View>
    );
  if (recovery)
    return (
      <SafeAreaView style={[s.page, { justifyContent: "center", padding: 24, gap: 16 }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Text style={s.h2}>Your saved training needs attention</Text>
        <Text accessibilityRole="alert" style={s.body}>
          {error}
        </Text>
        <Text style={s.body}>
          Your original saved data is preserved. Training and setup are paused so a new
          plan cannot overwrite it.
        </Text>
        <Link label="Try reading again" onPress={retry} />
      </SafeAreaView>
    );
  return (
    <SafeAreaView
      edges={[]}
      style={[s.page, !data.onboarded && { backgroundColor: "#080F0B" }]}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      {error ? (
        <View accessibilityRole="alert" style={{ padding: 12, backgroundColor: C.soft }}>
          <Text style={s.body}>{error}</Text>
          <Link label="Try saving again" onPress={retry} />
        </View>
      ) : null}
      {!data.onboarded ? (
        <Onboarding />
      ) : (
        <NavigationContainer
          theme={{
            ...DefaultTheme,
            dark: isDark,
            colors: {
              ...DefaultTheme.colors,
              background: C.bg,
              card: C.bg,
              text: C.ink,
              primary: C.green,
              border: C.line,
            },
          }}
        >
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: C.bg },
              headerTintColor: C.green,
              headerTitleStyle: { fontFamily: "Archivo_600SemiBold" },
              headerShadowVisible: false,
              headerBackButtonDisplayMode: "minimal",
              contentStyle: { backgroundColor: C.bg },
              animation: reduce ? "fade" : "default",
            }}
          >
            <Stack.Screen name="Main" component={Main} options={{ headerShown: false }} />
            <Stack.Screen
              name="Detail"
              component={Detail}
              options={{ title: "Drill details" }}
            />
            <Stack.Screen
              name="Replace"
              component={Replace}
              options={{ title: "Replace drill" }}
            />
            <Stack.Screen
              name="Practice"
              component={Practice}
              options={{ title: "Practice" }}
            />
            <Stack.Screen
              name="Recap"
              component={Recap}
              options={{
                title: "Session recap",
                headerBackVisible: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen name="Settings" component={Settings} />
            <Stack.Screen name="MyPlan" component={Plan} options={{ title: "My plan" }} />
            {DEVELOPER_FEATURES ? (
              <Stack.Screen
                name="Tools"
                component={ToolsHome}
                options={{ title: "More tools" }}
              />
            ) : null}
            {DEVELOPER_FEATURES ? (
              <Stack.Screen
                name="ToolCategory"
                component={ToolCategory}
                options={({ route }: any) => ({
                  title:
                    {
                      training: "Training",
                      coaching: "Coaching",
                      notebook: "Notebook",
                      connected: "Connected",
                    }[
                      route.params?.category as
                        "training" | "coaching" | "notebook" | "connected"
                    ] ?? "Training",
                })}
              />
            ) : null}
            <Stack.Screen
              name="SkillProfile"
              component={SkillProfileScreen}
              options={{ title: "Skill tests" }}
            />
            <Stack.Screen
              name="TouchProgress"
              component={TouchProgress}
              options={{ title: "Touch test" }}
            />
            <Stack.Screen
              name="PracticeMilestones"
              component={PracticeMilestones}
              options={{ title: "Practice milestones" }}
            />
            <Stack.Screen
              name="SessionHistory"
              component={SessionHistory}
              options={{ title: "Practice history" }}
            />
            <Stack.Screen
              name="ReplayOnboarding"
              component={ReplayOnboarding}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="Preferences"
              component={EditPreferences}
              options={{ title: "Training preferences" }}
            />
            {DEVELOPER_FEATURES ? (
              <Stack.Screen
                name="Replay"
                component={Replay}
                options={{ title: "Video replay" }}
              />
            ) : null}
            <Stack.Screen
              name="Assessment"
              component={Assessment}
              options={{ title: "Skill assessment" }}
            />
            <Stack.Screen
              name="TrainingPlanner"
              component={TrainingPlanner}
              options={{ title: "Training planner" }}
            />
            <Stack.Screen
              name="CustomDrillEditor"
              component={CustomDrillEditor}
              options={{ title: "Custom drill" }}
            />
            <Stack.Screen
              name="Playlists"
              component={Playlists}
              options={{ title: "Playlists" }}
            />
            <Stack.Screen name="Challenges" component={Challenges} />
            <Stack.Screen
              name="SkillTree"
              component={SkillTree}
              options={{ title: "Practice path" }}
            />
            <Stack.Screen name="Seasons" component={Seasons} />
            {DEVELOPER_FEATURES ? (
              <Stack.Screen
                name="AthleteFitness"
                component={AthleteFitnessScreen}
                options={{ title: "Fitness & mobility" }}
              />
            ) : null}
            {DEVELOPER_FEATURES ? (
              <Stack.Screen
                name="AthleteRuns"
                component={AthleteRunsScreen}
                options={{ title: "Run tracker" }}
              />
            ) : null}
            {DEVELOPER_FEATURES ? (
              <Stack.Screen
                name="AthleteFuel"
                component={AthleteFuelScreen}
                options={{ title: "Food & fueling" }}
              />
            ) : null}
            {DEVELOPER_FEATURES ? (
              <Stack.Screen
                name="AthleteRecovery"
                component={AthleteRecoveryScreen}
                options={{ title: "Recovery & mindset" }}
              />
            ) : null}
            {DEVELOPER_FEATURES ? (
              <Stack.Screen
                name="AthleteMatches"
                component={AthleteMatchesScreen}
                options={{ title: "Match notebook" }}
              />
            ) : null}
            {DEVELOPER_FEATURES ? (
              <Stack.Screen
                name="Account"
                component={AccountRoute}
                options={{ title: "Account & sync" }}
              />
            ) : null}
            {DEVELOPER_FEATURES ? (
              <Stack.Screen name="Community" component={CommunityScreen} />
            ) : null}
            {DEVELOPER_FEATURES ? (
              <Stack.Screen
                name="CoachWorkspace"
                component={CoachWorkspace}
                options={{ title: "Coach workspace" }}
              />
            ) : null}
            {DEVELOPER_FEATURES ? (
              <Stack.Screen
                name="CoachSessionBuilder"
                component={CoachSessionBuilder}
                options={{ title: "Build a session" }}
              />
            ) : null}
            {DEVELOPER_FEATURES ? (
              <Stack.Screen
                name="CoachSessionDetail"
                component={CoachSessionDetail}
                options={{ title: "Coach session" }}
              />
            ) : null}
            {DEVELOPER_FEATURES ? (
              <Stack.Screen
                name="TeamWorkspace"
                component={TeamWorkspace}
                options={{ title: "Local teams & matches" }}
              />
            ) : null}
            {DEVELOPER_FEATURES ? (
              <Stack.Screen
                name="CoachAI"
                component={CoachAI}
                options={{ title: "Training guide" }}
              />
            ) : null}
            {DEVELOPER_FEATURES ? (
              <Stack.Screen
                name="VideoFeedback"
                component={VideoFeedback}
                options={{ title: "Video feedback" }}
              />
            ) : null}
            {DEVELOPER_FEATURES ? (
              <Stack.Screen
                name="PoseReview"
                component={PoseReview}
                options={{ title: "Joint view" }}
              />
            ) : null}
            {DEVELOPER_FEATURES ? (
              <Stack.Screen name="Membership" component={MembershipScreen} />
            ) : null}
            <Stack.Screen
              name="Benchmark"
              component={Benchmark}
              options={{ title: "Record a benchmark" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </SafeAreaView>
  );
}
function AppContent() {
  const { C } = useTheme();
  const [loaded, error] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });
  if (!loaded && !error)
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center" }}>
        <ActivityIndicator color={C.green} />
      </View>
    );
  return (
    <SafeAreaProvider>
      <AppProvider>
        <RemindersProvider>
          <Shell />
        </RemindersProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
