import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";

import { N64Core } from "@/lib/n64-core";
import { type ControlLayoutItem, type N64Input } from "@/lib/n64-models";

type VirtualControlsProps = {
  controls: ControlLayoutItem[];
  enabled?: boolean;
};

const inputIds = new Set<N64Input>(["a", "b", "z", "l", "r", "start", "dpadUp", "dpadDown", "dpadLeft", "dpadRight", "cUp", "cDown", "cLeft", "cRight"]);

export function VirtualControls({ controls, enabled = true }: VirtualControlsProps) {
  const analogResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      const x = Math.max(-1, Math.min(1, gesture.dx / 36));
      const y = Math.max(-1, Math.min(1, gesture.dy / 36));
      N64Core.sendAnalog(x, y);
    },
    onPanResponderRelease: () => N64Core.sendAnalog(0, 0),
    onPanResponderTerminate: () => N64Core.sendAnalog(0, 0),
  });

  return (
    <View pointerEvents={enabled ? "box-none" : "none"} style={StyleSheet.absoluteFill}>
      {controls.filter((control) => control.visible).map((control) => {
        const size = control.size;
        const baseStyle = [
          styles.control,
          {
            width: size,
            height: size,
            borderRadius: control.id === "start" ? 14 : size / 2,
            opacity: control.opacity,
            left: `${control.x}%` as const,
            top: `${control.y}%` as const,
            marginLeft: -size / 2,
            marginTop: -size / 2,
          },
        ];

        if (control.id === "stick") {
          return (
            <View key={control.id} {...analogResponder.panHandlers} style={[...baseStyle, styles.stick]}>
              <View style={styles.stickCore} />
            </View>
          );
        }

        if (control.id === "dpad") {
          return (
            <View key={control.id} style={[...baseStyle, styles.dpad]}>
              <Text style={styles.dpadText}>✦</Text>
            </View>
          );
        }

        const input = inputIds.has(control.id as N64Input) ? (control.id as N64Input) : null;
        return (
          <Pressable
            key={control.id}
            disabled={!input}
            onPressIn={() => input && N64Core.sendButton(input, true)}
            onPressOut={() => input && N64Core.sendButton(input, false)}
            style={({ pressed }) => [...baseStyle, pressed && styles.controlPressed]}
          >
            <Text style={[styles.label, control.id.startsWith("c") && styles.cLabel]}>{control.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  control: { position: "absolute", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(66, 75, 111, 0.52)", borderWidth: 1, borderColor: "rgba(247,248,252,0.28)", shadowColor: "#000000", shadowOpacity: 0.24, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  controlPressed: { backgroundColor: "rgba(139,92,246,0.76)", transform: [{ scale: 0.94 }] },
  label: { color: "#F7F8FC", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
  cLabel: { fontSize: 10 },
  stick: { backgroundColor: "rgba(34, 211, 238, 0.18)", borderColor: "rgba(34, 211, 238, 0.52)" },
  stickCore: { width: "42%", height: "42%", borderRadius: 999, backgroundColor: "rgba(247,248,252,0.72)", borderWidth: 2, borderColor: "rgba(9,11,18,0.45)" },
  dpad: { borderRadius: 19, backgroundColor: "rgba(64, 71, 100, 0.64)" },
  dpadText: { color: "#F7F8FC", fontSize: 24, fontWeight: "800" },
});
