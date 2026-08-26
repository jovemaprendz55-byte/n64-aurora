import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatFileSize, type N64Game } from "@/lib/n64-models";

type GameCardProps = {
  game: N64Game;
  onPress: () => void;
};

export function GameCard({ game, onPress }: GameCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.artwork}>
        <View style={styles.artworkGlow} />
        <Text style={styles.artworkMark}>A</Text>
        <View style={styles.fileBadge}>
          <Text style={styles.fileBadgeText}>{game.format.toUpperCase()}</Text>
        </View>
        {game.favorite ? <MaterialIcons name="favorite" size={17} color="#F7F8FC" style={styles.favorite} /> : null}
      </View>
      <View style={styles.info}>
        <Text numberOfLines={2} style={styles.title}>{game.title}</Text>
        <Text numberOfLines={1} style={styles.meta}>{formatFileSize(game.sizeBytes)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: "48%", marginBottom: 18 },
  cardPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  artwork: { height: 176, borderRadius: 20, backgroundColor: "#171C31", borderWidth: 1, borderColor: "#303852", overflow: "hidden", justifyContent: "center", alignItems: "center" },
  artworkGlow: { position: "absolute", width: 150, height: 150, borderRadius: 75, backgroundColor: "#6D4AFF", opacity: 0.35, top: -36, right: -38 },
  artworkMark: { color: "#F7F8FC", fontSize: 74, lineHeight: 82, fontWeight: "800", letterSpacing: -6 },
  fileBadge: { position: "absolute", left: 10, bottom: 10, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, backgroundColor: "rgba(9,11,18,0.74)", borderWidth: 1, borderColor: "rgba(247,248,252,0.16)" },
  fileBadgeText: { color: "#D7DBE9", fontSize: 10, fontWeight: "800", letterSpacing: 0.7 },
  favorite: { position: "absolute", top: 11, right: 11 },
  info: { paddingTop: 9, paddingHorizontal: 2 },
  title: { color: "#F7F8FC", fontSize: 14, lineHeight: 19, fontWeight: "700" },
  meta: { color: "#A8B0C4", fontSize: 12, lineHeight: 17, marginTop: 3 },
});
