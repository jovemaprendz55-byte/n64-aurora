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

const runnerPath = fileURLToPath(
  new NodeURL("../modules/n64-core/android/src/main/cpp/n64_runner.cpp", import.meta.url),
);
const runnerSource = readFileSync(runnerPath, "utf8");

describe("N64 JNI video override", () => {
  it("rejects an override that the core does not accept", () => {
    expect(runnerSource).toContain("if (g_override_video() != 0)");
    expect(runnerSource).toContain("O core não aceitou a tabela de funções de vídeo");
  });
});

