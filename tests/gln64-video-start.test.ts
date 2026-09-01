import { readFileSync } from "node:fs";
import { fileURLToPath, URL as NodeURL } from "node:url";
import { describe, expect, it } from "vitest";

const sourcePath = fileURLToPath(
  new NodeURL("../vendor/mupen64plus-ae/mupen64plus-video-gln64/src/gles2N64.cpp", import.meta.url),
);
const source = readFileSync(sourcePath, "utf8");

describe("GLideN64 startup error propagation", () => {
  it("returns failure when OGL_Start cannot provide a video surface", () => {
    expect(source).toContain("if (!OGL_Start())");
    expect(source).toContain("return 0;");
  });
});

const openGlSourcePath = fileURLToPath(
  new NodeURL("../vendor/mupen64plus-ae/mupen64plus-video-gln64/src/OpenGL.cpp", import.meta.url),
);
const openGlSource = readFileSync(openGlSourcePath, "utf8");

describe("GLideN64 video extension diagnostics", () => {
  it("checks Init and SetVideoMode return codes", () => {
    expect(openGlSource).toContain("const m64p_error init_result = CoreVideo_Init();");
    expect(openGlSource).toContain("const m64p_error mode_result = CoreVideo_SetVideoMode");
  });
});

const bridgeHeaderPath = fileURLToPath(
  new NodeURL("../vendor/mupen64plus-ae/ae-bridge/src/ae_bridge.h", import.meta.url),
);
const bridgeHeaderSource = readFileSync(bridgeHeaderPath, "utf8");
const bridgeSourcePath = fileURLToPath(
  new NodeURL("../vendor/mupen64plus-ae/ae-bridge/src/ae_bridge.cpp", import.meta.url),
);
const bridgeSource = readFileSync(bridgeSourcePath, "utf8");

describe("ae-bridge surface ownership", () => {
  it("declares the video extension table once and handles a null Surface", () => {
    expect(bridgeHeaderSource).toContain("extern m64p_video_extension_functions vidExtFunctions;");
    expect(bridgeHeaderSource).not.toContain("vidExtFunctions = {14,");
    expect(bridgeSource).toContain("m64p_video_extension_functions vidExtFunctions = {14,");
    expect(bridgeSource).toContain("surface nula; janela EGL liberada");
    expect(bridgeSource).toContain("ANativeWindow_fromSurface retornou nulo");
  });
});

const runnerPath = fileURLToPath(
  new NodeURL("../modules/n64-core/android/src/main/cpp/n64_runner.cpp", import.meta.url),
);
const runnerSource = readFileSync(runnerPath, "utf8");

describe("N64 JNI video override", () => {
  it("rejects an override that the core does not accept", () => {
    expect(runnerSource).toContain("if (g_override_video() != 0)");
    expect(runnerSource).toContain("O core não aceitou a tabela de funções de vídeo");
  });

  it("passes the core debug callback and exposes video diagnostics", () => {
    expect(runnerSource).toContain("core_debug_callback");
    expect(runnerSource).toContain("nativeGetVideoDiagnostics");
    expect(bridgeSource).toContain("getVideoDiagnostics");
    expect(bridgeSource).toContain("swapAttemptCount");
    expect(runnerSource).toContain("Plugin de entrada sem callback JNI");
    expect(runnerSource).toContain("vídeo continuará disponível");
    expect(runnerSource).toContain("load_optional_library(g_audio");
    expect(runnerSource).toContain("g_audio != nullptr && g_attach_plugin(kPluginAudio, g_audio)");
  });
});

