import type { StyleProp, ViewStyle } from "react-native";

export type N64NativeSessionState = "idle" | "prepared" | "running" | "paused" | "stopped" | "error";

export type N64SessionSnapshot = {
  sessionId: string;
  state: N64NativeSessionState;
  coreLinked: boolean;
  message: string;
  hasSurface: boolean;
  gameId: string;
  profileId: string;
  videoDiagnostics?: string;
};

export type N64CoreModuleEvents = {
  onSessionState: (params: N64SessionSnapshot) => void;
};

export type N64CoreViewProps = {
  sessionId?: string;
  onSurfaceReady?: (event: { nativeEvent: { sessionId: string; width: number; height: number } }) => void;
  onSurfaceDestroyed?: (event: { nativeEvent: { sessionId: string } }) => void;
  style?: StyleProp<ViewStyle>;
};
