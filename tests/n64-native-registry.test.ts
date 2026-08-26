import { describe, expect, it } from "vitest";

import { hasExpoViewManager } from "../lib/n64-native-registry";

describe("registro da view N64Core", () => {
  it("reconhece a SurfaceView pelo metadado do Expo Modules API", () => {
    expect(hasExpoViewManager({
      NativeUnimoduleProxy: {
        viewManagersMetadata: { N64Core: { validAttributes: {} } },
      },
    }, "N64Core")).toBe(true);
  });

  it("não confunde módulo presente com view ausente", () => {
    expect(hasExpoViewManager({ NativeUnimoduleProxy: { viewManagersMetadata: {} } }, "N64Core")).toBe(false);
    expect(hasExpoViewManager({}, "N64Core")).toBe(false);
  });
});
