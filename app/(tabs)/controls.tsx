import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { VirtualControls } from "@/components/n64/virtual-controls";
import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { type ControlProfile } from "@/lib/n64-models";
import { loadProfiles, loadSettings } from "@/lib/n64-storage";

export default function ControlsScreen() {
  const [profile, setProfile] = useState<ControlProfile>();

  const refresh = useCallback(async () => {
    const [profiles, settings] = await Promise.all([loadProfiles(), loadSettings()]);
    setProfile(profiles.find((candidate) => candidate.id === settings.activeProfileId) ?? profiles[0]);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>INPUT TÁTIL</Text>
        <Text style={styles.heading}>Controles do seu jeito</Text>
        <Text style={styles.subtitle}>Mova, redimensione e ajuste a transparência de cada comando. O perfil fica salvo neste aparelho.</Text>

        <View style={styles.preview}>
          <View style={styles.previewScreen}><MaterialIcons name="videogame-asset" color="#65708B" size={48} /><Text style={styles.previewScreenText}>Prévia de jogo</Text></View>
          {profile ? <VirtualControls controls={profile.controls} enabled={false} /> : null}
          <View style={styles.profileChip}><View style={styles.profileDot} /><Text style={styles.profileChipText}>{profile?.name ?? "Carregando perfil"}</Text></View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryIcon}><MaterialIcons name="touch-app" size={20} color="#22D3EE" /></View>
          <View style={{ flex: 1 }}><Text style={styles.summaryTitle}>{profile?.controls.filter((control) => control.visible).length ?? 0} comandos visíveis</Text><Text style={styles.summaryText}>Personalize a posição e a intensidade visual com segurança.</Text></View>
        </View>

        <Pressable onPress={() => { haptic.medium(); router.push("/edit-controls"); }} style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
          <MaterialIcons name="tune" size={21} color="#090B12" />
          <Text style={styles.editText}>Editar controles</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 20 },
  eyebrow: { color: "#22D3EE", fontSize: 10, fontWeight: "800", letterSpacing: 1.65, marginTop: 10 },
  heading: { color: "#F7F8FC", fontSize: 28, lineHeight: 35, fontWeight: "800", letterSpacing: -0.8, marginTop: 4 },
  subtitle: { color: "#A8B0C4", fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: "92%" },
  preview: { flex: 1, minHeight: 370, marginTop: 24, borderRadius: 26, overflow: "hidden", backgroundColor: "#0D101B", borderWidth: 1, borderColor: "#2A3146", position: "relative" },
  previewScreen: { height: "43%", alignItems: "center", justifyContent: "center", backgroundColor: "#141827", borderBottomWidth: 1, borderBottomColor: "#27304A" },
  previewScreenText: { marginTop: 7, color: "#7E89A2", fontSize: 11, fontWeight: "700" },
  profileChip: { position: "absolute", top: 12, left: 12, paddingHorizontal: 10, height: 28, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(9,11,18,0.68)", borderWidth: 1, borderColor: "rgba(247,248,252,0.14)" },
  profileDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ADE80" },
  profileChipText: { color: "#D7DCEA", fontSize: 10, fontWeight: "700" },
  summaryRow: { flexDirection: "row", gap: 12, padding: 15, borderRadius: 18, backgroundColor: "#141827", borderWidth: 1, borderColor: "#2A3146", marginTop: 18 },
  summaryIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(34,211,238,0.10)" },
  summaryTitle: { color: "#F7F8FC", fontSize: 14, fontWeight: "800" },
  summaryText: { color: "#9AA4B9", fontSize: 11, lineHeight: 16, marginTop: 3 },
  editButton: { minHeight: 56, borderRadius: 17, backgroundColor: "#22D3EE", marginTop: 17, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  editText: { color: "#090B12", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
