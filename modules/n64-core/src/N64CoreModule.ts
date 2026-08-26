import { NativeModule, requireOptionalNativeModule } from "expo";

import type { N64CoreModuleEvents, N64SessionSnapshot } from "./N64Core.types";

declare class N64CoreNativeModule extends NativeModule<N64CoreModuleEvents> {
  readonly platform: string;
  readonly coreLinked: boolean;
  isAvailable(): boolean;
  getSnapshotAsync(): Promise<N64SessionSnapshot>;
  launchSession(romUri: string, gameId: string, profileId: string): Promise<N64SessionSnapshot>;
  pause(): Promise<N64SessionSnapshot>;
  resume(): Promise<N64SessionSnapshot>;
  stop(): Promise<N64SessionSnapshot>;
  sendButton(input: string, pressed: boolean): void;
  sendAnalog(x: number, y: number): void;
}

export type N64CoreNativeModuleType = N64CoreNativeModule;

export default requireOptionalNativeModule<N64CoreNativeModule>("N64Core");
