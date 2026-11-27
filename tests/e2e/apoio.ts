import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Page } from "@playwright/test";
import pg from "pg";

/** Banco que o app sob teste usa (já migrado antes de o app subir). */
const urlBanco = process.env.DATABASE_URL_TEST;

// A fonte única dos dados iniciais é a própria migração de seed.
const seedSql = readFileSync(resolve(process.cwd(), "drizzle", "0001_seed.sql"), "utf8").replaceAll(
  "--> statement-breakpoint",
  "",
);

/** Roda SQL direto no banco do app sob teste. */
export async function noBanco(sql: string, valores: unknown[] = []): Promise<void> {
  if (!urlBanco) throw new Error("DATABASE_URL_TEST não definida para os testes ponta a ponta");
  const cliente = new pg.Client({ connectionString: urlBanco });
  await cliente.connect();
  try {
    await cliente.query(sql, valores);
  } finally {
    await cliente.end();
  }
}

/** Zera pedidos e volta sabores e configuração ao seed, para cada teste começar do mesmo ponto. */
export async function reiniciarBanco(): Promise<void> {
  await noBanco(
    `TRUNCATE itens_pedido, pedidos, sabores, config RESTART IDENTITY CASCADE; ${seedSql}`,
  );
}

export async function entrar(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByLabel("Senha").fill("dev");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "PEDIDOS" })).toBeVisible();
}

/** Número mostrado no contador do topo com esse rótulo. */
export function contador(page: Page, rotulo: string) {
  return page
    .getByRole("list", { name: "Resumo dos pedidos" })
    .getByRole("listitem")
    .filter({ hasText: rotulo })
    .getByText(/^\d+$/);
}

export async function anotar(page: Page, cliente: string, itens: Record<string, number>): Promise<void> {
  await page.getByRole("button", { name: "Novo pedido" }).click();
  const dialogo = page.getByRole("dialog", { name: "Novo pedido" });
  await dialogo.getByLabel("Nome do cliente").fill(cliente);
  for (const [sabor, quantidade] of Object.entries(itens)) {
    await dialogo.getByRole("checkbox", { name: sabor, exact: true }).check();
    for (let i = 1; i < quantidade; i++) {
      await dialogo.getByRole("button", { name: `Aumentar ${sabor}`, exact: true }).click();
    }
  }
  await dialogo.getByRole("button", { name: "Anotar" }).click();
  await expect(dialogo).toBeHidden();
}

export function cartao(page: Page, secao: "preparacao" | "espera", cliente: string) {
  return page.locator(`#secao-${secao}`).getByRole("article").filter({ hasText: cliente });
}
