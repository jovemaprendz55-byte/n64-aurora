import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { DEFAULT_CONTROL_LAYOUT, type ControlId, type ControlLayoutItem, type ControlProfile, normalizeControlLayout } from "@/lib/n64-models";
import { loadProfiles, loadSettings, upsertProfile } from "@/lib/n64-storage";

type DraggableControlProps = { control: ControlLayoutItem; selected: boolean; onSelect: (id: ControlId) => void; onMove: (id: ControlId, dx: number, dy: number) => void; };
function DraggableControl({ control, selected, onSelect, onMove }: DraggableControlProps) {
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { onSelect(control.id); haptic.light(); },
    onPanResponderRelease: (_, gesture) => onMove(control.id, gesture.dx, gesture.dy),
    onPanResponderTerminate: (_, gesture) => onMove(control.id, gesture.dx, gesture.dy),
  }), [control.id, onMove, onSelect]);

  const size = control.size;
  return (
    <View
      {...responder.panHandlers}
      style={[styles.control, selected && styles.selectedControl, { width: size, height: size, borderRadius: control.id === "start" ? 13 : size / 2, opacity: control.opacity, left: `${control.x}%`, top: `${control.y}%`, marginLeft: -size / 2, marginTop: -size / 2 }]}
    >
      <Text style={[styles.controlText, control.id.startsWith("c") && styles.cControlText]}>{control.label}</Text>
    </View>
  );
}

export default function EditControlsScreen() {
  const [profile, setProfile] = useState<ControlProfile>();
  const [controls, setControls] = useState<ControlLayoutItem[]>([]);
  const [selectedId, setSelectedId] = useState<ControlId>("a");
  const [stage, setStage] = useState({ width: 360, height: 420 });

  const load = useCallback(async () => {
    const [profiles, settings] = await Promise.all([loadProfiles(), loadSettings()]);
    const active = profiles.find((candidate) => candidate.id === settings.activeProfileId) ?? profiles[0];
    setProfile(active);
    setControls(active.controls);
    setSelectedId(active.controls.find((item) => item.id === "a")?.id ?? active.controls[0]?.id ?? "a");
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const selected = controls.find((control) => control.id === selectedId) ?? controls[0];
  const updateSelected = (patch: Partial<ControlLayoutItem>) => {
    if (!selected) return;
    haptic.light();
    setControls((items) => normalizeControlLayout(items.map((item) => item.id === selected.id ? { ...item, ...patch } : item)));
  };
  const handleMove = useCallback((id: ControlId, dx: number, dy: number) => {
    setControls((items) => normalizeControlLayout(items.map((item) => item.id === id ? { ...item, x: item.x + (dx / stage.width) * 100, y: item.y + (dy / stage.height) * 100 } : item)));
  }, [stage.height, stage.width]);
  const save = async () => {
    if (!profile) return;
    await upsertProfile({ ...profile, controls: normalizeControlLayout(controls), updatedAt: new Date().toISOString() });
    haptic.success();
    router.back();
  };
  const restore = () => { haptic.medium(); setControls(DEFAULT_CONTROL_LAYOUT); setSelectedId("a"); };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background">
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><MaterialIcons name="close" size={21} color="#F7F8FC" /></Pressable>
          <View><Text style={styles.headerTitle}>Editar controles</Text><Text style={styles.headerSubtitle}>{profile?.name ?? "Carregando perfil"}</Text></View>
          <Pressable onPress={save} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}><Text style={styles.saveText}>Salvar</Text></Pressable>
        </View>

        <Text style={styles.helpText}>Arraste um comando para reposicioná-lo. Selecione-o para ajustar tamanho, opacidade e visibilidade.</Text>

        <View onLayout={(event) => setStage({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })} style={styles.stage}>
          <View style={styles.gridLineHorizontal} /><View style={styles.gridLineVertical} />
          <Text style={styles.stageLabel}>ZONA DE JOGO</Text>
          {controls.filter((control) => control.visible).map((control) => <DraggableControl key={control.id} control={control} selected={control.id === selectedId} onSelect={setSelectedId} onMove={handleMove} />)}
        </View>

        {selected ? <View style={styles.sheet}>
          <View style={styles.sheetHead}><View><Text style={styles.selectedLabel}>CONTROLE SELECIONADO</Text><Text style={styles.selectedName}>{selected.label}</Text></View><Pressable onPress={restore} style={({ pressed }) => [styles.restore, pressed && styles.pressed]}><MaterialIcons name="restart-alt" size={17} color="#C8BEFF" /><Text style={styles.restoreText}>Padrão</Text></Pressable></View>
          <View style={styles.actionsRow}>
            <View style={styles.actionGroup}><Text style={styles.actionLabel}>TAMANHO</Text><View style={styles.stepper}><Pressable onPress={() => updateSelected({ size: selected.size - 6 })} style={styles.stepButton}><MaterialIcons name="remove" size={17} color="#F7F8FC" /></Pressable><Text style={styles.stepValue}>{selected.size}</Text><Pressable onPress={() => updateSelected({ size: selected.size + 6 })} style={styles.stepButton}><MaterialIcons name="add" size={17} color="#F7F8FC" /></Pressable></View></View>
            <View style={styles.actionGroup}><Text style={styles.actionLabel}>OPACIDADE</Text><View style={styles.opacityRow}>{[0.45, 0.65, 0.82, 1].map((value) => <Pressable key={value} onPress={() => updateSelected({ opacity: value })} style={[styles.opacityOption, Math.abs(selected.opacity - value) < 0.06 && styles.opacityOptionSelected]}><Text style={[styles.opacityText, Math.abs(selected.opacity - value) < 0.06 && styles.opacityTextSelected]}>{Math.round(value * 100)}</Text></Pressable>)}</View></View>
            <Pressable onPress={() => updateSelected({ visible: !selected.visible })} style={({ pressed }) => [styles.visibilityButton, pressed && styles.pressed]}><MaterialIcons name={selected.visible ? "visibility" : "visibility-off"} size={19} color="#F7F8FC" /></Pressable>
          </View>
        </View> : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 12 },
  header: { height: 66, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 39, height: 39, borderRadius: 20, backgroundColor: "#171C2C", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#303852" },
  headerTitle: { color: "#F7F8FC", fontSize: 16, fontWeight: "800", textAlign: "center" },
  headerSubtitle: { color: "#8490A8", fontSize: 10, textAlign: "center", marginTop: 2 },
  saveButton: { minWidth: 57, height: 35, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#22D3EE" },
  saveText: { color: "#090B12", fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  helpText: { color: "#9AA4B9", fontSize: 12, lineHeight: 17, paddingHorizontal: 5, marginTop: 8 },
  stage: { flex: 1, minHeight: 367, maxHeight: 485, marginTop: 15, borderRadius: 25, overflow: "hidden", backgroundColor: "#0C0F1A", borderWidth: 1, borderColor: "#2B3450", position: "relative" },
  gridLineHorizontal: { position: "absolute", left: 0, right: 0, top: "50%", height: 1, backgroundColor: "rgba(75, 87, 125, 0.27)" },
  gridLineVertical: { position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, backgroundColor: "rgba(75, 87, 125, 0.27)" },
  stageLabel: { position: "absolute", top: "46%", alignSelf: "center", color: "rgba(126, 138, 169, 0.55)", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  control: { position: "absolute", backgroundColor: "rgba(74, 82, 116, 0.65)", borderWidth: 1.5, borderColor: "rgba(247,248,252,0.36)", justifyContent: "center", alignItems: "center" },
  selectedControl: { backgroundColor: "rgba(139,92,246,0.86)", borderColor: "#E2DCFF", borderWidth: 2.5, shadowColor: "#8B5CF6", shadowOpacity: 0.62, shadowRadius: 13, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  controlText: { color: "#F7F8FC", fontSize: 15, fontWeight: "900" },
  cControlText: { fontSize: 10 },
  sheet: { borderRadius: 20, backgroundColor: "#141827", borderWidth: 1, borderColor: "#2A3146", padding: 15, marginTop: 13 },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectedLabel: { color: "#818CA5", fontSize: 9, letterSpacing: 1.1, fontWeight: "800" },
  selectedName: { color: "#F7F8FC", fontSize: 16, fontWeight: "800", marginTop: 2 },
  restore: { flexDirection: "row", gap: 5, alignItems: "center", paddingVertical: 7, paddingHorizontal: 9, backgroundColor: "rgba(139,92,246,0.12)", borderRadius: 10 },
  restoreText: { color: "#C8BEFF", fontSize: 11, fontWeight: "800" },
  actionsRow: { flexDirection: "row", alignItems: "flex-end", gap: 12, marginTop: 14 },
  actionGroup: { flex: 1 },
  actionLabel: { color: "#818CA5", fontSize: 9, fontWeight: "800", letterSpacing: 0.8, marginBottom: 6 },
  stepper: { flexDirection: "row", alignItems: "center", height: 36, borderRadius: 11, overflow: "hidden", backgroundColor: "#20263A" },
  stepButton: { width: 31, height: 36, alignItems: "center", justifyContent: "center" },
  stepValue: { flex: 1, textAlign: "center", color: "#F7F8FC", fontSize: 12, fontWeight: "800" },
  opacityRow: { flexDirection: "row", gap: 3 },
  opacityOption: { flex: 1, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#20263A" },
  opacityOptionSelected: { backgroundColor: "#8B5CF6" },
  opacityText: { color: "#9AA4B9", fontSize: 9, fontWeight: "800" },
  opacityTextSelected: { color: "#FFFFFF" },
  visibilityButton: { width: 42, height: 36, borderRadius: 11, backgroundColor: "#20263A", alignItems: "center", justifyContent: "center" },
});
