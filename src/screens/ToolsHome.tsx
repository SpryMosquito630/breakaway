import { DEVELOPER_FEATURES } from "../config/features";
import { View } from "react-native";
import {
  Apple,
  Brain,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Dumbbell,
  Flag,
  Layers,
  MapPin,
  MessageCircle,
  ScanLine,
  Users,
  UserRound,
  Video,
  NotebookPen,
} from "lucide-react-native";
import { Page, SettingRow, useTheme } from "../components/ui";

const categories = {
  training: {
    label: "Training",
    description: "Planner, playlists and fitness",
    icon: CalendarDays,
    items: [
      { label: "Weekly planner", route: "TrainingPlanner", icon: CalendarDays },
      { label: "Playlists", route: "Playlists", icon: Layers },
      { label: "Fitness & mobility", route: "AthleteFitness", icon: Dumbbell },
    ],
  },
  coaching: {
    label: "Coaching",
    description: "Guidance, video and team sessions",
    icon: MessageCircle,
    items: [
      { label: "Training guide", route: "CoachAI", icon: MessageCircle },
      { label: "Video replay", route: "Replay", icon: Video },
      {
        label: "Joint view",
        value: "Experimental body tracking",
        route: "PoseReview",
        icon: ScanLine,
      },
      { label: "Coach workspace", route: "CoachWorkspace", icon: ClipboardList },
      { label: "Teams & matches", route: "TeamWorkspace", icon: Users },
    ],
  },
  notebook: {
    label: "Notebook",
    description: "Runs, food, recovery and matches",
    icon: NotebookPen,
    items: [
      { label: "Runs", route: "AthleteRuns", icon: MapPin },
      { label: "Food & fueling", route: "AthleteFuel", icon: Apple },
      { label: "Recovery & mindset", route: "AthleteRecovery", icon: Brain },
      { label: "Match notebook", route: "AthleteMatches", icon: Flag },
    ],
  },
  connected: {
    label: "Connected",
    description: "Optional online services",
    icon: UserRound,
    items: [
      {
        label: "Video feedback",
        value: "Online coaching review",
        route: "VideoFeedback",
        icon: Video,
      },
      { label: "Community", route: "Community", icon: Users },
      { label: "Account & sync", route: "Account", icon: UserRound },
      { label: "Membership", route: "Membership", icon: CreditCard },
    ],
  },
};
type Category = keyof typeof categories;

export function ToolsHome({ navigation }: { navigation: any }) {
  const { s } = useTheme();
  if (!DEVELOPER_FEATURES) return null;
  return (
    <Page>
      <View style={s.group}>
        {(Object.keys(categories) as Category[]).map((key) => {
          const category = categories[key];
          return (
            <SettingRow
              key={key}
              icon={category.icon}
              label={category.label}
              value={category.description}
              onPress={() => navigation.navigate("ToolCategory", { category: key })}
            />
          );
        })}
      </View>
    </Page>
  );
}

export function ToolCategory({ navigation, route }: { navigation: any; route: any }) {
  const { s } = useTheme();
  const category = categories[route.params?.category as Category] ?? categories.training;
  if (!DEVELOPER_FEATURES) return null;
  return (
    <Page>
      <View style={s.group}>
        {category.items.map((item) => (
          <SettingRow
            key={item.route}
            icon={item.icon}
            label={item.label}
            value={"value" in item ? item.value : undefined}
            onPress={() => navigation.navigate(item.route)}
          />
        ))}
      </View>
    </Page>
  );
}
