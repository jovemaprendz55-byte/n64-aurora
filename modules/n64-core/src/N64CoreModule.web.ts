import { NativeModule, registerWebModule } from "expo";

import type { N64CoreModuleEvents, N64SessionSnapshot } from "./N64Core.types";

class N64CoreWebModule extends NativeModule<N64CoreModuleEvents> {
  readonly platform = "web";
  readonly coreLinked = false;

  isAvailable(): boolean {
    return false;
  }

  async getSnapshotAsync(): Promise<N64SessionSnapshot> {
    return this.snapshot("idle", "A superfície nativa está disponível somente no build Android.");
  }

  async launchSession(): Promise<N64SessionSnapshot> {
    const snapshot = this.snapshot("error", "O núcleo nativo não é executado na visualização web.");
    this.emit("onSessionState", snapshot);
    throw new Error(snapshot.message);
  }

  async pause(): Promise<N64SessionSnapshot> {
    return this.snapshot("paused", "Sessão indisponível na web.");
  }

  async resume(): Promise<N64SessionSnapshot> {
    return this.snapshot("paused", "Sessão indisponível na web.");
  }

  async stop(): Promise<N64SessionSnapshot> {
    return this.snapshot("stopped", "Sessão encerrada.");
  }

  sendButton(): void {}
  sendAnalog(): void {}

  private snapshot(state: N64SessionSnapshot["state"], message: string): N64SessionSnapshot {
    return { sessionId: "", state, coreLinked: false, message, hasSurface: false, gameId: "", profileId: "" };
  }
}

export default registerWebModule(N64CoreWebModule, "N64Core");
