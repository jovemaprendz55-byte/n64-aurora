import { describe, expect, it } from "vitest";

import { getRomExtension, normalizeControlLayout, titleFromFileName } from "../lib/n64-models";

describe("modelos do N64 Aurora", () => {
  it("aceita extensões de ROM suportadas sem distinção de maiúsculas", () => {
    expect(getRomExtension("minha-rom.Z64")).toBe("z64");
    expect(getRomExtension("jogo.n64")).toBe("n64");
    expect(getRomExtension("arquivo.v64")).toBe("v64");
    expect(getRomExtension("documento.pdf")).toBeNull();
  });

  it("deriva um título legível do nome do arquivo", () => {
    expect(titleFromFileName("super_mario-64.z64")).toBe("Super Mario 64");
    expect(titleFromFileName("arquivo.n64")).toBe("Arquivo");
  });

  it("mantém controles em limites seguros da área de jogo", () => {
    const [control] = normalizeControlLayout([
      { id: "a", label: "A", x: 130, y: 1, size: 5, opacity: 1.5, visible: true },
    ]);
    expect(control.x).toBe(96);
    expect(control.y).toBe(8);
    expect(control.size).toBe(26);
    expect(control.opacity).toBe(1);
  });
});
