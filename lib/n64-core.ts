import { NativeModules, Platform, UIManager } from "react-native";

import type { N64Input } from "@/lib/n64-models";

type LaunchRequest = {
  romUri: string;
  gameId: string;
  profileId: string;
};

type NativeN64Core = {
  isAvailable?: () => Promise<boolean>;
  launchSession?: (request: LaunchRequest) => Promise<void>;
  sendButton?: (input: N64Input, pressed: boolean) => void;
  sendAnalog?: (x: number, y: number) => void;
  pause?: () => Promise<void>;
  resume?: () => Promise<void>;
  stop?: () => Promise<void>;
};

const nativeCore = NativeModules.N64CoreModule as NativeN64Core | undefined;

export const N64Core = {
  hasNativeModule: () => Boolean(nativeCore && Platform.OS !== "web"),
  hasNativeSurface: () => Platform.OS !== "web" && Boolean(UIManager.getViewManagerConfig("N64GameView")),
  async isAvailable(): Promise<boolean> {
    if (!nativeCore) return false;
    return nativeCore.isAvailable ? nativeCore.isAvailable() : true;
  },
  async launchSession(request: LaunchRequest): Promise<void> {
    if (!nativeCore?.launchSession) throw new Error("O núcleo nativo ainda não está incluído nesta compilação.");
    await nativeCore.launchSession(request);
  },
  sendButton(input: N64Input, pressed: boolean): void {
    nativeCore?.sendButton?.(input, pressed);
  },
  sendAnalog(x: number, y: number): void {
    nativeCore?.sendAnalog?.(x, y);
  },
  pause: async (): Promise<void> => nativeCore?.pause?.(),
  resume: async (): Promise<void> => nativeCore?.resume?.(),
  stop: async (): Promise<void> => nativeCore?.stop?.(),
};
