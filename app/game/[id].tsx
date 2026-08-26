import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { getGame, removeGame, setFavorite } from "@/lib/n64-storage";
import { formatFileSize, type N64Game } from "@/lib/n64-models";

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [game, setGame] = useState<N64Game>();
  const [loading, setLoading] = useState(true);

  const loadGame = useCallback(async () => {
    setLoading(true);
    const result = await getGame(id);
    setGame(result);
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { loadGame(); }, [loadGame]));

  const toggleFavorite = async () => {
    if (!game) return;
    haptic.light();
    await setFavorite(game.id, !game.favorite);
    setGame({ ...game, favorite: !game.favorite });
  };

  const confirmRemove = () => {
    if (!game) return;
    Alert.alert("Remover da biblioteca?", `O arquivo ${game.fileName} será removido do armazenamento deste aplicativo.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: async () => { await removeGame(game.id); router.back(); } },
    ]);
  };

  if (loading) {
    return <ScreenContainer className="items-center justify-center"><ActivityIndicator color="#8B5CF6" /></ScreenContainer>;
  }

  if (!game) {
    return (
      <ScreenContainer className="items-center justify-center px-8">
        <Text style={styles.notFoundTitle}>Jogo indisponível</Text>
        <Text style={styles.notFoundText}>Este item não está mais na biblioteca local.</Text>
        <Pressable onPress={() => router.back()} style={styles.secondaryButton}><Text style={styles.secondaryText}>Voltar para a biblioteca</Text></Pressable>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background">
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}><MaterialIcons name="arrow-back" color="#F7F8FC" size={22} /></Pressable>
          <Pressable onPress={toggleFavorite} style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}><MaterialIcons name={game.favorite ? "favorite" : "favorite-border"} color={game.favorite ? "#F472B6" : "#F7F8FC"} size={22} /></Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroMark}>A</Text>
          <View style={styles.heroChip}><Text style={styles.heroChipText}>ROM PRÓPRIA</Text></View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{game.title}</Text>
          <Text style={styles.subtitle}>{game.fileName}</Text>
        </View>

        <View style={styles.statRow}>
          <View style={styles.stat}><Text style={styles.statLabel}>FORMATO</Text><Text style={styles.statValue}>{game.format.toUpperCase()}</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statLabel}>ARQUIVO</Text><Text style={styles.statValue}>{formatFileSize(game.sizeBytes)}</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statLabel}>ÚLTIMA SESSÃO</Text><Text style={styles.statValue}>{game.lastPlayedAt ? new Date(game.lastPlayedAt).toLocaleDateString("pt-BR") : "Ainda não"}</Text></View>
        </View>

        <Pressable onPress={() => { haptic.medium(); router.push({ pathname: "/play/[id]", params: { id: game.id } }); }} style={({ pressed }) => [styles.playButton, pressed && styles.playPressed]}>
          <MaterialIcons name="play-arrow" size={25} color="#090B12" />
          <Text style={styles.playText}>Jogar agora</Text>
        </Pressable>

        <View style={styles.infoPanel}>
          <MaterialIcons name="info-outline" color="#22D3EE" size={20} />
          <Text style={styles.infoText}>O jogo será iniciado pelo núcleo open source incluído no build Android nativo. A tela de visualização não executa bibliotecas JNI.</Text>
        </View>

        <Pressable onPress={confirmRemove} style={({ pressed }) => [styles.removeButton, pressed && styles.iconPressed]}><MaterialIcons name="delete-outline" color="#F87171" size={20} /><Text style={styles.removeText}>Remover da biblioteca</Text></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 38 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#171C2C", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#303852" },
  iconPressed: { opacity: 0.66, transform: [{ scale: 0.97 }] },
  hero: { height: 260, borderRadius: 28, backgroundColor: "#171C31", overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#303852" },
  heroGlow: { position: "absolute", backgroundColor: "#8B5CF6", opacity: 0.42, width: 285, height: 285, borderRadius: 143, right: -95, top: -100 },
  heroMark: { color: "#F7F8FC", fontSize: 135, fontWeight: "900", letterSpacing: -12, lineHeight: 148 },
  heroChip: { position: "absolute", bottom: 18, left: 18, backgroundColor: "rgba(9,11,18,0.70)", paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: "rgba(247,248,252,0.14)" },
  heroChipText: { color: "#D9DDEF", fontSize: 10, letterSpacing: 1.1, fontWeight: "800" },
  titleBlock: { marginTop: 25 },
  title: { color: "#F7F8FC", fontSize: 29, lineHeight: 36, fontWeight: "800", letterSpacing: -0.7 },
  subtitle: { color: "#A8B0C4", fontSize: 13, lineHeight: 19, marginTop: 6 },
  statRow: { flexDirection: "row", backgroundColor: "#141827", borderColor: "#2A3146", borderWidth: 1, paddingVertical: 17, paddingHorizontal: 14, borderRadius: 18, marginTop: 24, alignItems: "center" },
  stat: { flex: 1 },
  statDivider: { width: 1, height: 32, backgroundColor: "#2A3146", marginHorizontal: 10 },
  statLabel: { color: "#727C98", fontSize: 9, fontWeight: "800", letterSpacing: 0.85 },
  statValue: { color: "#F7F8FC", fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 3 },
  playButton: { height: 58, borderRadius: 17, marginTop: 24, backgroundColor: "#22D3EE", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  playPressed: { transform: [{ scale: 0.98 }], opacity: 0.88 },
  playText: { color: "#090B12", fontSize: 16, fontWeight: "800" },
  infoPanel: { flexDirection: "row", gap: 11, marginTop: 18, backgroundColor: "rgba(34,211,238,0.08)", padding: 15, borderRadius: 15, borderWidth: 1, borderColor: "rgba(34,211,238,0.18)" },
  infoText: { flex: 1, color: "#B8C6D8", fontSize: 12, lineHeight: 18 },
  removeButton: { marginTop: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48 },
  removeText: { color: "#F87171", fontSize: 13, fontWeight: "700" },
  notFoundTitle: { color: "#F7F8FC", fontSize: 24, fontWeight: "800" },
  notFoundText: { color: "#A8B0C4", fontSize: 14, textAlign: "center", lineHeight: 20, marginTop: 8 },
  secondaryButton: { marginTop: 20, backgroundColor: "#20263A", paddingHorizontal: 18, paddingVertical: 13, borderRadius: 14 },
  secondaryText: { color: "#F7F8FC", fontWeight: "700" },
});
