// @vitest-environment node
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "../..");
const marca = (n: string) => path.join(raiz, "public", "marca", n);
const app = (n: string) => path.join(raiz, "src", "app", n);

// [arquivo, lado maior, medida usada]
const comAlfa: Array<[string, number]> = [
  [marca("espeto.png"), 128],
  [marca("churrasqueira.png"), 128],
  [marca("chama.png"), 128],
  [marca("logo-branco.png"), 320],
  [marca("logo-escuro.png"), 480],
];
const iconesApp: Array<[string, number]> = [
  [app("icon.png"), 32],
  [app("apple-icon.png"), 180],
  [marca("icone-192.png"), 192],
  [marca("icone-512.png"), 512],
];

describe("arquivos da marca", () => {
  it.each(comAlfa)("%s e PNG com alfa e lado maior %i", async (arquivo, lado) => {
    const m = await sharp(arquivo).metadata();
    expect(m.format).toBe("png");
    expect(m.hasAlpha).toBe(true);
    expect(Math.max(m.width, m.height)).toBe(lado);
  });

  it.each(iconesApp)("%s e PNG quadrado %ipx", async (arquivo, lado) => {
    const m = await sharp(arquivo).metadata();
    expect(m.format).toBe("png");
    expect(m.width).toBe(lado);
    expect(m.height).toBe(lado);
  });

  it("chama.png tem canto transparente", async () => {
    const { data } = await sharp(marca("chama.png"))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(data[3]).toBe(0);
  });
});
