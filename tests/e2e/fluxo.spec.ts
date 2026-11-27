import { expect, test } from "@playwright/test";
import { anotar, cartao, contador, entrar, reiniciarBanco } from "./apoio";

test.beforeEach(async () => {
  await reiniciarBanco();
});

test("anota, avança, entrega, atrasa e cancela pedidos", async ({ page }) => {
  await test.step("sem sessão vai para /entrar e a senha dev entra", async () => {
    await entrar(page);
  });

  await test.step("anota Maria com 2 Carne e 1 Coração", async () => {
    await anotar(page, "Maria", { Carne: 2, Coração: 1 });
    const maria = cartao(page, "preparacao", "MARIA");
    await expect(maria).toContainText("2 Carne · 1 Coração");
    await expect(maria).toContainText("Total: 3");
    await expect(contador(page, "Preparação")).toHaveText("1");
  });

  await test.step("Pronto leva para Espera e Entregue finaliza", async () => {
    await cartao(page, "preparacao", "MARIA").getByRole("button", { name: "Pronto" }).click();
    const emEspera = cartao(page, "espera", "MARIA");
    await expect(emEspera).toBeVisible();
    await expect(contador(page, "Espera")).toHaveText("1");

    await emEspera.getByRole("button", { name: "Entregue" }).click();
    await expect(contador(page, "Entregue")).toHaveText("1");
    await expect(contador(page, "Espera")).toHaveText("0");
    const finalizados = page.locator("#secao-finalizados");
    await expect(finalizados.getByRole("listitem").filter({ hasText: "MARIA" })).toContainText("Entregue");
  });

  await test.step("com tempo máximo 1, Ana fica atrasada", async () => {
    await page.goto("/configuracoes");
    await page.getByLabel("Minutos até o pedido contar como atrasado").fill("1");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Tempo salvo" })).toBeVisible();

    await page.clock.install();
    await page.goto("/");
    await anotar(page, "Ana", { Frango: 1 });
    const ana = cartao(page, "preparacao", "ANA");
    await expect(ana).toBeVisible();
    await expect(ana).not.toContainText("ATRASADO");

    // O painel corrige o relógio pelo `agora` do servidor a cada busca (3 s). Avançar só o
    // relógio do navegador seria desfeito na busca seguinte, então o `agora` das respostas
    // avança junto: para o app inteiro passaram 2 minutos.
    await page.route("**/api/pedidos", async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      const resposta = await route.fetch();
      const corpo = (await resposta.json()) as { agora: string };
      corpo.agora = new Date(new Date(corpo.agora).getTime() + 2 * 60_000).toISOString();
      await route.fulfill({ response: resposta, json: corpo });
    });
    await page.clock.fastForward("02:00");

    await expect(ana).toContainText("ATRASADO 1 MIN");
    await expect(
      page.getByRole("list", { name: "Resumo dos pedidos" }).getByRole("listitem").filter({ hasText: "Preparação" }),
    ).toContainText("1 atrasado");
  });

  await test.step("cancelar Ana pede confirmação no cartão", async () => {
    const ana = cartao(page, "preparacao", "ANA");
    await ana.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(ana).toContainText("Cancelar pedido de ANA?");
    await ana.getByRole("button", { name: "Sim" }).click();
    await expect(contador(page, "Cancelado")).toHaveText("1");
    await expect(contador(page, "Preparação")).toHaveText("0");
  });
});
