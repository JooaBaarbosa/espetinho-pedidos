import { expect, test, type Page } from "@playwright/test";
import { cartao, entrar, noBanco, reiniciarBanco } from "./apoio";

/**
 * Capturas das telas principais em celular e tablet para conferência visual
 * (salvas em test-results/screenshots/, fora do git). Também garante que nenhuma
 * tela rola na horizontal.
 */
const LARGURAS = [
  { nome: "390", width: 390, height: 844 },
  { nome: "1024", width: 1024, height: 768 },
];

const PASTA = "test-results/screenshots";

async function semRolagemHorizontal(page: Page) {
  const { rolagem, largura } = await page.evaluate(() => ({
    rolagem: document.documentElement.scrollWidth,
    largura: document.documentElement.clientWidth,
  }));
  expect(rolagem).toBeLessThanOrEqual(largura);
}

async function capturar(page: Page, nome: string) {
  await semRolagemHorizontal(page);
  await page.screenshot({ path: `${PASTA}/${nome}.png`, fullPage: true });
}

test.beforeEach(async () => {
  await reiniciarBanco();
  // Dois pedidos de demonstração: um anotado há 20 min (passa do padrão de 15) e um há 2 min.
  await noBanco(`
    INSERT INTO pedidos (id, cliente, criado_em) VALUES
      ('00000000-0000-4000-8000-000000000001', 'João', now() - interval '20 minutes'),
      ('00000000-0000-4000-8000-000000000002', 'Maria Eduarda', now() - interval '2 minutes');
    INSERT INTO itens_pedido (pedido_id, sabor_id, nome_sabor, quantidade) VALUES
      ('00000000-0000-4000-8000-000000000001', 1, 'Carne', 3),
      ('00000000-0000-4000-8000-000000000001', 7, 'Coração', 2),
      ('00000000-0000-4000-8000-000000000002', 2, 'Frango', 1),
      ('00000000-0000-4000-8000-000000000002', 6, 'Kafta com queijo', 2);
  `);
});

for (const { nome, width, height } of LARGURAS) {
  test(`telas em ${nome} px`, async ({ page, browser }) => {
    await page.setViewportSize({ width, height });

    const anonimo = await browser.newContext({ viewport: { width, height } });
    const telaEntrar = await anonimo.newPage();
    await telaEntrar.goto("/entrar");
    await expect(telaEntrar.getByLabel("Senha")).toBeVisible();
    await capturar(telaEntrar, `entrar-${nome}`);
    await anonimo.close();

    await entrar(page);
    await expect(page.getByRole("heading", { name: "PEDIDOS" })).toBeInViewport();
    await expect(cartao(page, "preparacao", "JOÃO")).toContainText("ATRASADO 5 MIN");
    await expect(cartao(page, "preparacao", "MARIA EDUARDA")).toBeVisible();
    // Nenhum texto dos contadores do topo cortado (rótulo, número, aviso de atraso).
    const cortados = await page
      .getByRole("list", { name: "Resumo dos pedidos" })
      .getByRole("listitem")
      .evaluateAll((itens) =>
        itens.flatMap((li) =>
          Array.from(li.children)
            .filter((parte) => parte.scrollWidth > parte.clientWidth)
            .map((parte) => parte.textContent),
        ),
      );
    expect(cortados).toEqual([]);
    await capturar(page, `painel-${nome}`);

    await page.getByRole("button", { name: "Novo pedido" }).click();
    const dialogo = page.getByRole("dialog", { name: "Novo pedido" });
    await dialogo.getByLabel("Nome do cliente").fill("Ana");
    await dialogo.getByRole("checkbox", { name: "Carne", exact: true }).check();
    await dialogo.getByRole("button", { name: "Aumentar Carne", exact: true }).click();
    await dialogo.getByLabel("Nome do cliente").scrollIntoViewIfNeeded();
    await semRolagemHorizontal(page);
    await page.screenshot({ path: `${PASTA}/novo-pedido-${nome}.png` });
    await dialogo.getByRole("button", { name: "Fechar" }).click();

    await page.goto("/configuracoes");
    await expect(page.getByRole("button", { name: "Salvar" })).toBeVisible();
    await capturar(page, `configuracoes-${nome}`);
  });
}
