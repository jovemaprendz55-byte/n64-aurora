const { withAppBuildGradle, withGradleProperties, withProjectBuildGradle, withSettingsGradle } = require("@expo/config-plugins");

const MODULES = [
  "mupen64plus-core",
  "mupen64plus-audio-android",
  "mupen64plus-input-android",
  "mupen64plus-rsp-hle",
  "mupen64plus-video-gln64",
  "ae-bridge",
];
const NDK_VERSION = "27.2.12479018";

const withMupen64plusAe = (config) => {
  config = withGradleProperties(config, (properties) => {
    const key = "android.packagingOptions.pickFirsts";
    const existing = properties.modResults.find((item) => item.type === "property" && item.key === key);
    if (existing) {
      if (!existing.value.includes("**/libc++_shared.so")) existing.value += ",**/libc++_shared.so";
    } else {
      properties.modResults.push({ type: "property", key, value: "**/libc++_shared.so" });
    }
    return properties;
  });

  config = withProjectBuildGradle(config, (project) => {
    if (project.modResults.contents.includes(`ndkVersion = "${NDK_VERSION}"`)) return project;
    project.modResults.contents = project.modResults.contents.replace(
      "buildscript {",
      `buildscript {\n  ext { ndkVersion = "${NDK_VERSION}" }`,
    );
    return project;
  });

  config = withSettingsGradle(config, (settings) => {
    if (settings.modResults.contents.includes("mupen64plus-core")) return settings;

    const inclusions = MODULES.map(
      (name) => `include ':${name}'\nproject(':${name}').projectDir = new File(rootDir, '../vendor/mupen64plus-ae/${name}')`,
    ).join("\n");
    settings.modResults.contents += `\n// N64 Aurora: módulos GPL-3.0 do Mupen64Plus-AE (commit 25cfb7a)\n${inclusions}\n`;
    return settings;
  });

  config = withAppBuildGradle(config, (app) => {
    if (app.modResults.contents.includes("implementation project(':mupen64plus-core')")) return app;

    const dependencies = MODULES.map((name) => `    implementation project(':${name}')`).join("\n");
    app.modResults.contents += `\n// N64 Aurora: inclui core, plugins e ae-bridge do Mupen64Plus-AE\ndependencies {\n${dependencies}\n}\n`;
    return app;
  });

  return config;
};

module.exports = withMupen64plusAe;
