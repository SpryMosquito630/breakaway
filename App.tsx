import { haptic } from "./src/utils/haptics";
import { useEffect, useState } from "react";
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
import { Archivo_600SemiBold } from "@expo-google-fonts/archivo/600SemiBold";
import { IBMPlexMono_400Regular } from "@expo-google-fonts/ibm-plex-mono/400Regular";
import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono/500Medium";
import {
  CalendarDays,
  ListChecks,
  TrafficCone,
  ChartNoAxesCombined,
  Settings2,
} from "lucide-react-native";
import { AppProvider, useApp } from "./src/state/AppState";
import { Onboarding, ReplayOnboarding } from "./src/screens/Onboarding";
import { Today, Plan } from "./src/screens/Home";
import { Library, Detail, Replace } from "./src/screens/Library";
import { Practice, Recap } from "./src/screens/Practice";
import { Progress, Benchmark } from "./src/screens/Progress";
import { Settings, EditPreferences } from "./src/screens/Settings";
import { Link, IconButton, useTheme } from "./src/components/ui";
import { ThemeProvider } from "./src/theme/ThemeProvider";
import { RemindersProvider } from "./src/notifications/RemindersProvider";
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const icons = {
  Today: CalendarDays,
  "My Plan": ListChecks,
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
      <Tab.Screen name="Today" component={Today} />
      <Tab.Screen name="My Plan" component={Plan} />
      <Tab.Screen name="Drills" component={Library} />
      <Tab.Screen name="Progress" component={Progress} />
    </Tab.Navigator>
  );
}
function Shell() {
  const { C, s, isDark } = useTheme();
  const { data, loading, error, retry } = useApp();
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => sub.remove();
  }, []);
  if (loading)
    return (
      <View
        style={[
          s.page,
          { justifyContent: "center", alignItems: "center", gap: 16 },
        ]}
      >
        <Text
          style={{
            fontFamily: "BarlowCondensed_800ExtraBold",
            fontSize: 32,
            color: C.green,
          }}
        >
          Breakaway
        </Text>
        <ActivityIndicator
          color={C.green}
          accessibilityLabel="Loading your saved plan"
        />
      </View>
    );
  return (
    <SafeAreaView edges={data.onboarded ? [] : ["top"]} style={s.page}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {error ? (
        <View
          accessibilityRole="alert"
          style={{ padding: 12, backgroundColor: C.soft }}
        >
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
            <Stack.Screen
              name="Main"
              component={Main}
              options={{ headerShown: false }}
            />
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
            <Stack.Screen
              name="ReplayOnboarding"
              component={ReplayOnboarding}
              options={({ navigation }) => ({
                title: "Onboarding",
                headerRight: () => (
                  <Link label="Cancel" onPress={() => navigation.goBack()} />
                ),
              })}
            />

            <Stack.Screen
              name="Preferences"
              component={EditPreferences}
              options={{ title: "Training preferences" }}
            />
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
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });
  if (!loaded && !error)
    return (
      <View
        style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center" }}
      >
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
