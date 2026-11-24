import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CartaoPedido } from "@/components/CartaoPedido";
import type { Pedido } from "@/lib/tipos";

const AGORA = new Date("2026-11-24T20:00:00.000Z");

function pedido(msAtras: number, status: Pedido["status"] = "preparacao"): Pedido {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    cliente: "João",
    status,
    criadoEm: new Date(AGORA.getTime() - msAtras).toISOString(),
    prontoEm: null,
    finalizadoEm: null,
    itens: [
      { saborId: 1, nomeSabor: "Carne", quantidade: 2 },
      { saborId: 2, nomeSabor: "Frango", quantidade: 1 },
    ],
  };
}

afterEach(cleanup);

describe("CartaoPedido", () => {
  it("em preparação no prazo: cronômetro, itens, Pronto e Cancelar, sem atraso", () => {
    render(<CartaoPedido pedido={pedido(10 * 60_000)} agora={AGORA} tempoMaxMin={15} onAcao={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "JOÃO" })).toBeInTheDocument();
    expect(screen.getByText("2 Carne · 1 Frango")).toBeInTheDocument();
    expect(screen.getByText("Total: 3")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pronto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.queryByText(/ATRASADO/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("article").className).not.toMatch(/atrasado/);
  });

  it("criado há 19 min 59 s com máximo 15: ATRASADO 4 MIN, classe atrasado e um alerta", () => {
    render(
      <CartaoPedido
        pedido={pedido(19 * 60_000 + 59_000)}
        agora={AGORA}
        tempoMaxMin={15}
        onAcao={vi.fn()}
      />,
    );
    expect(screen.getByText("ATRASADO 4 MIN")).toBeInTheDocument();
    expect(screen.getByRole("article").className).toMatch(/atrasado/);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("em espera: botão Entregue, sem Pronto", () => {
    render(<CartaoPedido pedido={pedido(60_000, "espera")} agora={AGORA} tempoMaxMin={15} onAcao={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Entregue" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pronto" })).not.toBeInTheDocument();
  });

  it("Pronto chama onAcao('pronto')", async () => {
    const onAcao = vi.fn().mockResolvedValue(undefined);
    render(<CartaoPedido pedido={pedido(60_000)} agora={AGORA} tempoMaxMin={15} onAcao={onAcao} />);
    await userEvent.click(screen.getByRole("button", { name: "Pronto" }));
    expect(onAcao).toHaveBeenCalledWith("pronto");
  });

  it("Cancelar pede confirmação no cartão; só chama onAcao após Sim", async () => {
    const onAcao = vi.fn().mockResolvedValue(undefined);
    render(<CartaoPedido pedido={pedido(60_000)} agora={AGORA} tempoMaxMin={15} onAcao={onAcao} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByText("Cancelar pedido de JOÃO?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pronto" })).not.toBeInTheDocument();
    expect(onAcao).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Sim" }));
    expect(onAcao).toHaveBeenCalledTimes(1);
    expect(onAcao).toHaveBeenCalledWith("cancelar");
  });

  it("Não volta aos botões sem chamar onAcao", async () => {
    const onAcao = vi.fn().mockResolvedValue(undefined);
    render(<CartaoPedido pedido={pedido(60_000)} agora={AGORA} tempoMaxMin={15} onAcao={onAcao} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await userEvent.click(screen.getByRole("button", { name: "Não" }));
    expect(screen.queryByText("Cancelar pedido de JOÃO?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pronto" })).toBeInTheDocument();
    expect(onAcao).not.toHaveBeenCalled();
  });
});
