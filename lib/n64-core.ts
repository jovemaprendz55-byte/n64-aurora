import { NativeModules, Platform } from "react-native";

import N64CoreModule from "@/modules/n64-core/src/N64CoreModule";
import type { N64SessionSnapshot } from "@/modules/n64-core/src/N64Core.types";
import type { N64Input } from "@/lib/n64-models";
import { hasExpoViewManager } from "@/lib/n64-native-registry";

type LaunchRequest = {
  romUri: string;
  gameId: string;
  profileId: string;
};

const unavailableMessage = "A ponte Android está instalada, mas o núcleo Mupen64Plus-AE ainda não foi empacotado nesta compilação.";

export const N64Core = {
  hasNativeModule: () => Boolean(N64CoreModule && Platform.OS !== "web"),
  // Expo Modules registra views como ViewManagerAdapter_N64Core. Na Nova Arquitetura,
  // UIManager.getViewManagerConfig("N64Core") não representa essa view.
  hasNativeSurface: () => Platform.OS !== "web" && Boolean(N64CoreModule) && hasExpoViewManager(NativeModules, "N64Core"),
  async isAvailable(): Promise<boolean> {
    return N64CoreModule?.isAvailable() ?? false;
  },
  async launchSession(request: LaunchRequest): Promise<N64SessionSnapshot> {
    if (!N64CoreModule) throw new Error("O módulo nativo ainda não está incluído nesta compilação.");
    if (!N64CoreModule.isAvailable()) throw new Error(unavailableMessage);
    return N64CoreModule.launchSession(request.romUri, request.gameId, request.profileId);
  },
  getSnapshot: async (): Promise<N64SessionSnapshot | undefined> => N64CoreModule?.getSnapshotAsync(),
  addSessionListener: (listener: (snapshot: N64SessionSnapshot) => void) => N64CoreModule?.addListener("onSessionState", listener),
  sendButton(input: N64Input, pressed: boolean): void {
    N64CoreModule?.sendButton(input, pressed);
  },
  sendAnalog(x: number, y: number): void {
    N64CoreModule?.sendAnalog(x, y);
  },
  pause: async (): Promise<N64SessionSnapshot | undefined> => N64CoreModule?.pause(),
  resume: async (): Promise<N64SessionSnapshot | undefined> => N64CoreModule?.resume(),
  stop: async (): Promise<N64SessionSnapshot | undefined> => N64CoreModule?.stop(),
};
