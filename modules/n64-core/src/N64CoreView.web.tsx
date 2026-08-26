import { useEffect } from "react";
import { View } from "react-native";

import type { N64CoreViewProps } from "./N64Core.types";

export default function N64CoreView({ onSurfaceReady, style }: N64CoreViewProps) {
  useEffect(() => {
    onSurfaceReady?.({ nativeEvent: { sessionId: "", width: 0, height: 0 } });
  }, [onSurfaceReady]);

  return <View style={[{ backgroundColor: "#000000" }, style]} />;
}
