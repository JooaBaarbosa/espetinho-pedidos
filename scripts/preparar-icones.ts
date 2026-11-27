// Gera os ícones e logos da marca a partir de conteudo/ (originais, somente leitura).
// Determinístico: rodar de novo sobrescreve com saída idêntica.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");
const origem = (...p: string[]) => path.join(raiz, "conteudo", ...p);
const marca = (...p: string[]) => path.join(raiz, "public", "marca", ...p);
const app = (...p: string[]) => path.join(raiz, "src", "app", ...p);

const BRASA = { r: 0xa9, g: 0x32, b: 0x26 };
const LIMIAR_ALFA = 12;

type Glifo = { dados: Buffer; largura: number; altura: number };

// `borda`: px ignorados nas bordas (o LOGO-03 tem filete claro na margem).
// Alfa pelo canal verde: fundo (G = fundoG) vira 0, branco (G = 255) vira 255.
// O glifo resultante é sempre branco puro (RGB = 255), sem halo da cor de fundo.
async function glifoBranco(arquivo: string, fundoG: number, borda = 0): Promise<Glifo> {
  const { data, info } = await sharp(arquivo)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const rgba = Buffer.alloc(width * height * 4);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let i = 0; i < width * height; i++) {
    const g = data[i * 3 + 1];
    const px = i % width;
    const py = (i - px) / width;
    const naBorda = px < borda || py < borda || px >= width - borda || py >= height - borda;
    const bruto = Math.max(0, Math.min(255, Math.round(((g - fundoG) * 255) / (255 - fundoG))));
    // Ruído de compressão abaixo do limiar vira transparência total.
    const alfa = naBorda || bruto <= LIMIAR_ALFA ? 0 : bruto;
    rgba[i * 4] = 255;
    rgba[i * 4 + 1] = 255;
    rgba[i * 4 + 2] = 255;
    rgba[i * 4 + 3] = alfa;
    if (alfa > LIMIAR_ALFA) {
      const x = i % width;
      const y = (i - x) / width;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const largura = maxX - minX + 1;
  const altura = maxY - minY + 1;
  const dados = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: largura, height: altura })
    .png()
    .toBuffer();
  return { dados, largura, altura };
}

async function icone(arquivo: string, destino: string) {
  const g = await glifoBranco(origem("icons", arquivo), BRASA.g);
  await sharp(g.dados)
    .resize({ width: 128, height: 128, fit: "inside" })
    .png({ compressionLevel: 9 })
    .toFile(destino);
}

async function iconesApp() {
  const g = await glifoBranco(origem("icons", "DESTAQUES-01.png"), BRASA.g);
  const lado = Math.max(g.largura, g.altura);
  const margem = Math.round(lado * 0.18);
  const total = lado + margem * 2;
  const mestre = await sharp({
    create: { width: total, height: total, channels: 3, background: BRASA },
  })
    .composite([
      {
        input: g.dados,
        left: Math.round((total - g.largura) / 2),
        top: Math.round((total - g.altura) / 2),
      },
    ])
    .png()
    .toBuffer();
  const saidas: Array<[number, string]> = [
    [32, app("icon.png")],
    [180, app("apple-icon.png")],
    [192, marca("icone-192.png")],
    [512, marca("icone-512.png")],
  ];
  for (const [tam, destino] of saidas) {
    await sharp(mestre)
      .resize(tam, tam, { kernel: "lanczos3" })
      .removeAlpha()
      .png({ compressionLevel: 9 })
      .toFile(destino);
  }
}

async function logos() {
  const branco = await glifoBranco(origem("logo", "LOGO-03.png"), 0, 16);
  await sharp(branco.dados)
    .resize({ width: 320 })
    .png({ compressionLevel: 9 })
    .toFile(marca("logo-branco.png"));

  const escuro = await sharp(origem("icons", "TAG-PARA-FOTOS-PNG-SEM-FUNDO-01.png"))
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .toBuffer();
  await sharp(escuro)
    .resize({ width: 480 })
    .png({ compressionLevel: 9 })
    .toFile(marca("logo-escuro.png"));
}

await mkdir(marca(), { recursive: true });
await icone("DESTAQUES-02.png", marca("espeto.png"));
await icone("DESTAQUES-03.png", marca("churrasqueira.png"));
await icone("DESTAQUES-05.png", marca("chama.png"));
await iconesApp();
await logos();
console.log("Marca gerada.");
