import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { ScreenContainer } from "@/components/screen-container";
import { VirtualControls } from "@/components/n64/virtual-controls";
import { N64Core } from "@/lib/n64-core";
import { DEFAULT_CONTROL_LAYOUT, type N64Game } from "@/lib/n64-models";
import { getGame, loadProfiles, loadSettings, markGamePlayed } from "@/lib/n64-storage";

export default function PlayGameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [game, setGame] = useState<N64Game>();
  const [isLaunching, setIsLaunching] = useState(true);
  const [nativeAvailable, setNativeAvailable] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function launch() {
      const selectedGame = await getGame(id);
      const settings = await loadSettings();
      const profiles = await loadProfiles();
      const profile = profiles.find((candidate) => candidate.id === settings.activeProfileId) ?? profiles[0];
      const available = await N64Core.isAvailable();
      if (selectedGame && available) {
        await N64Core.launchSession({ romUri: selectedGame.uri, gameId: selectedGame.id, profileId: profile.id });
        await markGamePlayed(selectedGame.id);
      }
      if (isMounted) {
        setGame(selectedGame);
        setNativeAvailable(available && N64Core.hasNativeSurface());
        setIsLaunching(false);
      }
    }
    launch();
    return () => { isMounted = false; N64Core.stop(); };
  }, [id]);

  if (isLaunching) {
    return <ScreenContainer className="items-center justify-center"><StatusBar style="light" /><ActivityIndicator color="#22D3EE" /></ScreenContainer>;
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background">
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}><MaterialIcons name="close" color="#F7F8FC" size={22} /></Pressable>
          <View style={styles.gameLabel}><View style={[styles.statusDot, nativeAvailable && styles.statusDotActive]} /><Text numberOfLines={1} style={styles.gameTitle}>{game?.title ?? "Sessão"}</Text></View>
          <Pressable onPress={() => N64Core.pause()} style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}><MaterialIcons name="pause" color="#F7F8FC" size={20} /></Pressable>
        </View>

        <View style={styles.viewport}>
          <View style={styles.viewportGrid} />
          <View style={styles.videoPlaceholder}>
            <MaterialIcons name={nativeAvailable ? "videogame-asset" : "memory"} size={33} color="#22D3EE" />
            <Text style={styles.videoTitle}>{nativeAvailable ? "A sessão foi iniciada" : "Núcleo nativo não incluído"}</Text>
            <Text style={styles.videoText}>{nativeAvailable ? "A superfície de vídeo Android será exibida nesta área." : "Compile o projeto Android com a camada JNI do Mupen64Plus-AE para executar a ROM selecionada."}</Text>
          </View>
        </View>

        <View style={styles.controlArea}>
          <VirtualControls controls={DEFAULT_CONTROL_LAYOUT} enabled={nativeAvailable} />
          {!nativeAvailable ? <Text style={styles.previewCaption}>Prévia dos controles virtuais</Text> : null}
        </View>

        <View style={styles.bottomBar}>
          <Pressable onPress={() => router.push("/edit-controls")} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}><MaterialIcons name="tune" size={18} color="#F7F8FC" /><Text style={styles.quickText}>Editar</Text></Pressable>
          <Text style={styles.sessionHint}>{nativeAvailable ? "Sessão ativa" : "Modo de visualização"}</Text>
          <Pressable onPress={() => N64Core.pause()} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}><MaterialIcons name="more-horiz" size={20} color="#F7F8FC" /><Text style={styles.quickText}>Menu</Text></Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14, paddingBottom: 10 },
  topBar: { height: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roundButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#171C2C", borderWidth: 1, borderColor: "#303852", justifyContent: "center", alignItems: "center" },
  pressed: { opacity: 0.65, transform: [{ scale: 0.96 }] },
  gameLabel: { maxWidth: "62%", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: "#141827" },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#8290A9" },
  statusDotActive: { backgroundColor: "#4ADE80" },
  gameTitle: { color: "#F7F8FC", fontSize: 12, fontWeight: "700" },
  viewport: { aspectRatio: 1.48, maxHeight: 265, borderRadius: 23, backgroundColor: "#0E1220", overflow: "hidden", borderWidth: 1, borderColor: "#29324B", justifyContent: "center", alignItems: "center" },
  viewportGrid: { position: "absolute", width: "150%", height: "150%", opacity: 0.22, transform: [{ rotate: "-12deg" }], backgroundColor: "transparent", borderWidth: 18, borderColor: "#313A59" },
  videoPlaceholder: { width: "79%", alignItems: "center", padding: 20, borderRadius: 18, backgroundColor: "rgba(23, 28, 49, 0.78)", borderWidth: 1, borderColor: "rgba(34,211,238,0.18)" },
  videoTitle: { color: "#F7F8FC", fontSize: 15, fontWeight: "800", marginTop: 9 },
  videoText: { color: "#A8B0C4", fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: 5 },
  controlArea: { flex: 1, minHeight: 292, marginTop: 8, position: "relative" },
  previewCaption: { position: "absolute", alignSelf: "center", bottom: 11, color: "#747F99", fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  bottomBar: { height: 52, borderRadius: 17, backgroundColor: "#141827", borderWidth: 1, borderColor: "#2A3146", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 11 },
  quickAction: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 7, paddingVertical: 7 },
  quickText: { color: "#F7F8FC", fontSize: 12, fontWeight: "700" },
  sessionHint: { color: "#8490A8", fontSize: 11, fontWeight: "600" },
});
