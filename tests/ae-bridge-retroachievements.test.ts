import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const bridgeSource = readFileSync(
  "vendor/mupen64plus-ae/ae-bridge/src/ae_bridge.cpp",
  "utf8",
);

describe("integração opcional de RetroAchievements", () => {
  it("limpa a exceção JNI quando o callback Java não faz parte do aplicativo", () => {
    expect(bridgeSource).toContain('"paulscode/android/mupen64plusae/jni/RetroAchievementsManager"');
    expect(bridgeSource).toContain("env->ExceptionCheck()");
    expect(bridgeSource).toContain("env->ExceptionClear()");
    expect(bridgeSource).toContain("callbacks opcionais desativados");
  });
});
