import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { GameCard } from "@/components/n64/game-card";
import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { type N64Game } from "@/lib/n64-models";
import { importRom, loadGames } from "@/lib/n64-storage";

export default function LibraryScreen() {
  const [games, setGames] = useState<N64Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true);
    setGames(await loadGames());
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const handleImport = async () => {
    setMessage(undefined);
    haptic.medium();
    try {
      setImporting(true);
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const game = await importRom(result.assets[0]);
      setGames((current) => [game, ...current]);
      haptic.success();
    } catch (error) {
      haptic.error();
      setMessage(error instanceof Error ? error.message : "Não foi possível importar esse arquivo.");
    } finally {
      setImporting(false);
    }
  };

  const favorites = useMemo(() => games.filter((game) => game.favorite), [games]);
  const recent = useMemo(() => games.filter((game) => game.lastPlayedAt).sort((a, b) => (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? "")), [games]);

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <StatusBar style="light" />
      <FlatList
        data={games}
        keyExtractor={(game) => game.id}
        numColumns={2}
        columnWrapperStyle={games.length ? styles.row : undefined}
        contentContainerStyle={[styles.listContent, !games.length && styles.listContentEmpty]}
        renderItem={({ item }) => <GameCard game={item} onPress={() => router.push({ pathname: "/game/[id]", params: { id: item.id } })} />}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>N64 AURORA</Text>
                <Text style={styles.heading}>Sua biblioteca</Text>
              </View>
              <Pressable onPress={() => router.push("/settings")} style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}><MaterialIcons name="settings" size={21} color="#F7F8FC" /></Pressable>
            </View>
            <View style={styles.hero}>
              <View style={styles.heroOrb} />
              <View style={styles.heroPrismOne} />
              <View style={styles.heroPrismTwo} />
              <View style={styles.heroCopy}>
                <Text style={styles.heroKicker}>{games.length ? `${games.length} ${games.length === 1 ? "jogo pronto" : "jogos prontos"}` : "COMECE POR AQUI"}</Text>
                <Text style={styles.heroTitle}>{games.length ? "Tudo que é seu, num só lugar." : "Organize suas ROMs próprias."}</Text>
                <Text style={styles.heroText}>Importe arquivos .z64, .n64 ou .v64. Nenhum jogo é fornecido pelo aplicativo.</Text>
              </View>
              <Pressable disabled={importing} onPress={handleImport} style={({ pressed }) => [styles.importButton, (pressed || importing) && styles.importPressed]}>
                {importing ? <ActivityIndicator size="small" color="#090B12" /> : <MaterialIcons name="add" size={22} color="#090B12" />}
                <Text style={styles.importText}>{importing ? "Importando" : "Importar ROM"}</Text>
              </Pressable>
            </View>
            {message ? <View style={styles.errorCard}><MaterialIcons name="error-outline" color="#FCA5A5" size={18} /><Text style={styles.errorText}>{message}</Text></View> : null}
            {games.length ? <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Todos os jogos</Text><Text style={styles.sectionHint}>{favorites.length ? `${favorites.length} favorito${favorites.length === 1 ? "" : "s"} · ` : ""}{recent.length ? `${recent.length} com sessão recente` : "Ordenados por importação"}</Text></View><Text style={styles.countBadge}>{games.length}</Text></View> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? <ActivityIndicator color="#8B5CF6" style={{ marginTop: 58 }} /> : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><MaterialIcons name="folder-open" color="#22D3EE" size={30} /></View>
              <Text style={styles.emptyTitle}>A coleção está vazia</Text>
              <Text style={styles.emptyText}>Escolha uma cópia compatível que você possui para adicioná-la ao armazenamento deste aparelho.</Text>
              {Platform.OS === "web" ? <Text style={styles.webNote}>A importação de arquivos é testada no Android; esta visualização serve para conferir a interface.</Text> : null}
            </View>
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 20, paddingBottom: 30 },
  listContentEmpty: { flexGrow: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, marginBottom: 21 },
  eyebrow: { color: "#22D3EE", fontSize: 10, fontWeight: "800", letterSpacing: 1.65 },
  heading: { color: "#F7F8FC", fontSize: 29, lineHeight: 35, fontWeight: "800", letterSpacing: -0.8, marginTop: 3 },
  settingsButton: { width: 43, height: 43, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#171C2C", borderWidth: 1, borderColor: "#303852" },
  pressed: { opacity: 0.68, transform: [{ scale: 0.96 }] },
  hero: { borderRadius: 24, minHeight: 205, backgroundColor: "#171C31", borderWidth: 1, borderColor: "#303852", overflow: "hidden", padding: 21, justifyContent: "space-between" },
  heroOrb: { position: "absolute", width: 235, height: 235, borderRadius: 118, backgroundColor: "#7146EA", opacity: 0.42, top: -126, right: -62 },
  heroPrismOne: { position: "absolute", width: 63, height: 63, borderRadius: 18, backgroundColor: "rgba(34,211,238,0.16)", borderWidth: 1, borderColor: "rgba(34,211,238,0.38)", transform: [{ rotate: "28deg" }], right: 31, bottom: 37 },
  heroPrismTwo: { position: "absolute", width: 31, height: 31, borderRadius: 9, backgroundColor: "rgba(200,190,255,0.55)", transform: [{ rotate: "28deg" }], right: 48, bottom: 53 },
  heroCopy: { width: "83%" },
  heroKicker: { color: "#C8BEFF", fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  heroTitle: { color: "#F7F8FC", fontSize: 23, lineHeight: 29, fontWeight: "800", letterSpacing: -0.45, marginTop: 8 },
  heroText: { color: "#B7BED1", fontSize: 12, lineHeight: 18, marginTop: 7 },
  importButton: { alignSelf: "flex-start", minHeight: 44, borderRadius: 14, backgroundColor: "#22D3EE", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  importPressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
  importText: { color: "#090B12", fontSize: 13, fontWeight: "800" },
  errorCard: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, padding: 12, borderRadius: 14, backgroundColor: "rgba(248,113,113,0.10)", borderWidth: 1, borderColor: "rgba(248,113,113,0.24)" },
  errorText: { flex: 1, color: "#FBC4C4", fontSize: 12, lineHeight: 17 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 28, marginBottom: 15 },
  sectionTitle: { color: "#F7F8FC", fontSize: 18, lineHeight: 23, fontWeight: "800" },
  sectionHint: { color: "#8E99B1", fontSize: 11, lineHeight: 16, marginTop: 2 },
  countBadge: { minWidth: 28, height: 28, paddingHorizontal: 8, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#242B42", color: "#D8DEEF", overflow: "hidden", fontSize: 12, fontWeight: "800", textAlignVertical: "center" },
  row: { justifyContent: "space-between" },
  empty: { alignSelf: "center", alignItems: "center", maxWidth: 286, marginTop: 54 },
  emptyIcon: { width: 70, height: 70, borderRadius: 23, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(34,211,238,0.10)", borderWidth: 1, borderColor: "rgba(34,211,238,0.20)" },
  emptyTitle: { color: "#F7F8FC", fontSize: 19, fontWeight: "800", marginTop: 19 },
  emptyText: { color: "#A8B0C4", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 7 },
  webNote: { color: "#7F8BA4", fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 16 },
});
