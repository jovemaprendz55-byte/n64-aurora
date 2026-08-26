import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { DEFAULT_SETTINGS, type N64Settings } from "@/lib/n64-models";
import { loadSettings, saveSettings } from "@/lib/n64-storage";

type SettingRowProps = { icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; description: string; children?: React.ReactNode; onPress?: () => void; };
function SettingRow({ icon, title, description, children, onPress }: SettingRowProps) {
  const content = <><View style={styles.settingIcon}><MaterialIcons name={icon} color="#C8BEFF" size={20} /></View><View style={styles.settingCopy}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingDescription}>{description}</Text></View>{children ?? (onPress ? <MaterialIcons name="chevron-right" color="#7A849B" size={22} /> : null)}</>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>{content}</Pressable> : <View style={styles.settingRow}>{content}</View>;
}

export default function SettingsScreen() {
  const [settings, setSettings] = useState<N64Settings>(DEFAULT_SETTINGS);
  useFocusEffect(useCallback(() => { loadSettings().then(setSettings); }, []));

  const change = async (patch: Partial<N64Settings>) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    await saveSettings(updated);
    haptic.light();
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>PREFERÊNCIAS</Text>
        <Text style={styles.heading}>Ajustes</Text>
        <Text style={styles.subtitle}>As escolhas abaixo permanecem neste aparelho e serão aplicadas à próxima sessão.</Text>

        <Text style={styles.groupLabel}>EMULAÇÃO</Text>
        <View style={styles.group}>
          <SettingRow icon="speed" title="Priorizar desempenho" description="Prefira uma execução mais leve quando o núcleo nativo estiver disponível.">
            <Switch value={settings.preferPerformance} onValueChange={(value) => change({ preferPerformance: value })} trackColor={{ false: "#38405B", true: "#7C55E6" }} thumbColor="#F7F8FC" />
          </SettingRow>
          <View style={styles.divider} />
          <SettingRow icon="vibration" title="Resposta tátil" description="Feedback discreto em ações importantes da interface.">
            <Switch value={settings.hapticsEnabled} onValueChange={(value) => change({ hapticsEnabled: value })} trackColor={{ false: "#38405B", true: "#7C55E6" }} thumbColor="#F7F8FC" />
          </SettingRow>
        </View>

        <Text style={styles.groupLabel}>CONTROLES</Text>
        <View style={styles.group}>
          <SettingRow icon="tune" title="Editar perfil ativo" description="Mude posição, tamanho e transparência dos controles." onPress={() => router.push("/edit-controls")} />
          <View style={styles.divider} />
          <SettingRow icon="opacity" title="Perfil Aurora padrão" description="O perfil atual é salvo localmente e pode ser restaurado no editor." />
        </View>

        <Text style={styles.groupLabel}>LEGAL E CÓDIGO ABERTO</Text>
        <View style={styles.group}>
          <SettingRow icon="description" title="Licenças e avisos" description="Mupen64Plus AE e obrigações de distribuição." onPress={() => router.push("/licenses")} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 20 },
  eyebrow: { color: "#22D3EE", fontSize: 10, fontWeight: "800", letterSpacing: 1.65, marginTop: 10 },
  heading: { color: "#F7F8FC", fontSize: 29, lineHeight: 35, fontWeight: "800", letterSpacing: -0.8, marginTop: 4 },
  subtitle: { color: "#A8B0C4", fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: "92%" },
  groupLabel: { color: "#818CA5", fontSize: 10, letterSpacing: 1.25, fontWeight: "800", marginTop: 27, marginBottom: 9 },
  group: { borderRadius: 18, backgroundColor: "#141827", borderWidth: 1, borderColor: "#2A3146", overflow: "hidden" },
  settingRow: { minHeight: 77, paddingHorizontal: 15, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  settingIcon: { width: 37, height: 37, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(139,92,246,0.13)" },
  settingCopy: { flex: 1 },
  settingTitle: { color: "#F7F8FC", fontSize: 14, fontWeight: "800" },
  settingDescription: { color: "#9AA4B9", fontSize: 11, lineHeight: 15, marginTop: 3 },
  divider: { height: 1, backgroundColor: "#2A3146", marginLeft: 64 },
  pressed: { opacity: 0.7 },
});
