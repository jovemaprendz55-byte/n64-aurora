import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  decodeURIComponent(new URL("../modules/n64-core/android/src/main/cpp/n64_runner.cpp", import.meta.url).pathname),
  "utf8",
);

describe("N64 runner startup order", () => {
  it("installs the video override before ROM and plugin startup", () => {
    const startup = source.indexOf("startup(kCoreApiVersion");
    const override = source.indexOf("g_override_video();", startup);
    const romOpen = source.indexOf("kCommandRomOpen", override);
    const attachGfx = source.indexOf("g_attach_plugin(kPluginGfx", romOpen);
    const attachRsp = source.indexOf("g_attach_plugin(kPluginRsp", attachGfx);

    expect(startup).toBeGreaterThanOrEqual(0);
    expect(override).toBeGreaterThan(startup);
    expect(romOpen).toBeGreaterThan(override);
    expect(attachGfx).toBeGreaterThan(romOpen);
    expect(attachRsp).toBeGreaterThan(attachGfx);
  });

  it("does not report the session running before plugin startup completes", () => {
    const pluginAttach = source.indexOf("g_attach_plugin(kPluginGfx");
    const running = source.indexOf("g_running = true;", pluginAttach);

    expect(pluginAttach).toBeGreaterThanOrEqual(0);
    expect(running).toBeGreaterThan(pluginAttach);
  });
});

