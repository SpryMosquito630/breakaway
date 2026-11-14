import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Play } from "lucide-react-native";
import type { Drill } from "../domain/model";
import { drillMedia } from "../data/drill-media";
import { drillMovements } from "../data/drill-movements";
import { useTheme } from "../theme/ThemeProvider";
import { DrillMovementThumbnail } from "./DrillMovementThumbnail";

/** A still image only. Browsing the library never allocates video players. */
export const DrillArtwork = memo(function DrillArtwork({ drill }: { drill: Drill }) {
  const { C } = useTheme();
  const media = drillMedia(drill);
  if (!media) {
    if (!drillMovements[drill.id]) return null;
    return (
      <View style={[styles.frame, { backgroundColor: C.pitchSoft }]} accessible={false}>
        <DrillMovementThumbnail drillId={drill.id} />
      </View>
    );
  }
  return (
    <View style={styles.frame} accessible={false}>
      <Image
        source={media.source}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={drill.id}
        accessible={false}
        style={StyleSheet.absoluteFill}
      />
      {media.video ? (
        <View style={styles.play}>
          <Play size={13} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1.7} />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  frame: { width: 100, height: 76, borderRadius: 12, overflow: "hidden" },
  play: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#0B211BDD",
    alignItems: "center",
    justifyContent: "center",
  },
});
