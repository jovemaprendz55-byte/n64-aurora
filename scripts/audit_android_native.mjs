import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const vendor = path.join(root, "vendor", "mupen64plus-ae");
const releaseDir = path.join(vendor, "ndkLibs", "libs", "release", "arm64-v8a");
const debugDir = path.join(vendor, "ndkLibs", "libs", "debug", "arm64-v8a");
const requiredRelease = [
  "libEGLLoader.a",
  "libSDL2_net.so",
  "libhidapi.so",
  "libpng.a",
  "librcheevos.a",
  "libsoundtouch.so",
  "libsoundtouch_fp.so",
];
const modules = [
  "mupen64plus-core",
  "mupen64plus-audio-android",
  "mupen64plus-input-android",
  "mupen64plus-rsp-hle",
  "mupen64plus-video-gln64",
  "ae-bridge",
];

const missingRelease = requiredRelease.filter((library) => !existsSync(path.join(releaseDir, library)));
const missingDebug = requiredRelease.filter((library) => !existsSync(path.join(debugDir, library)));
const nativeCommon = readFileSync(path.join(vendor, "build_common", "native_common.mk"), "utf8");
const forceRelease = nativeCommon.includes("BUILD_VARIANT := release") && !nativeCommon.includes("NDK_DEBUG");
const namespaces = modules.map((module) => {
  const buildGradle = readFileSync(path.join(vendor, module, "build.gradle"), "utf8");
  return { module, namespace: buildGradle.match(/namespace\s*=\s*["']([^"']+)["']/)?.[1] ?? null };
});
const byNamespace = new Map();
for (const item of namespaces) {
  if (!item.namespace) continue;
  byNamespace.set(item.namespace, [...(byNamespace.get(item.namespace) ?? []), item.module]);
}
const duplicates = [...byNamespace.entries()]
  .filter(([, modulesWithNamespace]) => modulesWithNamespace.length > 1)
  .map(([namespace, modulesWithNamespace]) => ({ namespace, modules: modulesWithNamespace }));

const result = {
  targetAbi: "arm64-v8a",
  releaseDependencies: { missing: missingRelease, complete: missingRelease.length === 0 },
  debugDependencies: { missing: missingDebug, complete: missingDebug.length === 0, releaseForced: forceRelease },
  namespaces,
  duplicateNamespaces: duplicates,
  status: duplicates.length === 0 && missingRelease.length === 0 && (forceRelease || missingDebug.length === 0)
    ? "review-required"
    : "build-risk-confirmed",
};

console.log(JSON.stringify(result, null, 2));
if (missingRelease.length > 0 || duplicates.length > 0) process.exitCode = 2;
