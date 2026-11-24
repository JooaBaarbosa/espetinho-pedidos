import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormNovoPedido } from "@/components/FormNovoPedido";
import type { Sabor } from "@/lib/tipos";

const SABORES: Sabor[] = [
  { id: 1, nome: "Carne", ativo: true, ordem: 1 },
  { id: 2, nome: "Frango", ativo: true, ordem: 2 },
];

afterEach(cleanup);

function montar(enviar = vi.fn().mockResolvedValue({})) {
  const onConcluido = vi.fn();
  const onFechar = vi.fn();
  render(<FormNovoPedido sabores={SABORES} enviar={enviar} onConcluido={onConcluido} onFechar={onFechar} />);
  return { enviar, onConcluido, onFechar };
}

describe("FormNovoPedido", () => {
  it("abre como diálogo, com foco no nome e Anotar desabilitado", () => {
    montar();
    const dialogo = screen.getByRole("dialog", { name: "Novo pedido" });
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(screen.getByLabelText("Nome do cliente")).toHaveFocus();
    expect(screen.getByRole("button", { name: "Anotar" })).toBeDisabled();
  });

  it("marcar sabor mostra o seletor com 1 e total no singular", async () => {
    const u = userEvent.setup();
    montar();
    await u.type(screen.getByLabelText("Nome do cliente"), "João");
    expect(screen.queryByRole("button", { name: "Aumentar Carne" })).not.toBeInTheDocument();
    await u.click(screen.getByRole("checkbox", { name: "Carne" }));
    expect(screen.getByRole("button", { name: "Aumentar Carne" })).toBeInTheDocument();
    expect(screen.getByText("Total: 1 espetinho")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anotar" })).toBeEnabled();
  });

  it("soma quantidades: Carne 3 e Frango 1 dão Total: 4 espetinhos", async () => {
    const u = userEvent.setup();
    montar();
    await u.click(screen.getByRole("checkbox", { name: "Carne" }));
    await u.click(screen.getByRole("button", { name: "Aumentar Carne" }));
    await u.click(screen.getByRole("button", { name: "Aumentar Carne" }));
    await u.click(screen.getByRole("checkbox", { name: "Frango" }));
    expect(screen.getByText("Total: 4 espetinhos")).toBeInTheDocument();
  });

  it("limites: Diminuir em 1 fica em 1 e Aumentar em 50 fica em 50", async () => {
    const u = userEvent.setup();
    montar();
    await u.click(screen.getByRole("checkbox", { name: "Carne" }));
    await u.click(screen.getByRole("button", { name: "Diminuir Carne" }));
    expect(screen.getByText("Total: 1 espetinho")).toBeInTheDocument();
    for (let i = 0; i < 55; i++) await u.click(screen.getByRole("button", { name: "Aumentar Carne" }));
    expect(screen.getByText("Total: 50 espetinhos")).toBeInTheDocument();
  });

  it("desmarcar remove o item", async () => {
    const u = userEvent.setup();
    montar();
    await u.type(screen.getByLabelText("Nome do cliente"), "Ana");
    await u.click(screen.getByRole("checkbox", { name: "Carne" }));
    await u.click(screen.getByRole("checkbox", { name: "Carne" }));
    expect(screen.queryByRole("button", { name: "Aumentar Carne" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anotar" })).toBeDisabled();
  });

  it("nome só com espaços mantém Anotar desabilitado", async () => {
    const u = userEvent.setup();
    montar();
    await u.type(screen.getByLabelText("Nome do cliente"), "   ");
    await u.click(screen.getByRole("checkbox", { name: "Carne" }));
    expect(screen.getByRole("button", { name: "Anotar" })).toBeDisabled();
  });

  it("enviar recebe id, cliente e itens; sucesso chama onConcluido e limpa o formulário", async () => {
    const u = userEvent.setup();
    const { enviar, onConcluido } = montar();
    await u.type(screen.getByLabelText("Nome do cliente"), "João");
    await u.click(screen.getByRole("checkbox", { name: "Carne" }));
    await u.click(screen.getByRole("button", { name: "Aumentar Carne" }));
    await u.click(screen.getByRole("button", { name: "Aumentar Carne" }));
    await u.click(screen.getByRole("checkbox", { name: "Frango" }));
    await u.click(screen.getByRole("button", { name: "Anotar" }));
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(enviar).toHaveBeenCalledWith({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      cliente: "João",
      itens: [
        { saborId: 1, quantidade: 3 },
        { saborId: 2, quantidade: 1 },
      ],
    });
    await waitFor(() => expect(onConcluido).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Nome do cliente")).toHaveValue("");
    expect(screen.queryByText(/^Total:/)).not.toBeInTheDocument();
  });

  it("toque duplo com envio pendente chama enviar uma vez", async () => {
    const u = userEvent.setup();
    const enviar = vi.fn().mockReturnValue(new Promise(() => {}));
    montar(enviar);
    await u.type(screen.getByLabelText("Nome do cliente"), "João");
    await u.click(screen.getByRole("checkbox", { name: "Carne" }));
    await u.dblClick(screen.getByRole("button", { name: "Anotar" }));
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Anotar" })).toBeDisabled();
  });

  it("falha: mostra erro e Tentar de novo reenvia o mesmo id", async () => {
    const u = userEvent.setup();
    const enviar = vi.fn().mockRejectedValueOnce(new Error("rede")).mockResolvedValue({});
    const { onConcluido } = montar(enviar);
    await u.type(screen.getByLabelText("Nome do cliente"), "João");
    await u.click(screen.getByRole("checkbox", { name: "Carne" }));
    await u.click(screen.getByRole("button", { name: "Anotar" }));
    expect(await screen.findByText("Não foi possível anotar. Verifique a conexão.")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await waitFor(() => expect(onConcluido).toHaveBeenCalledTimes(1));
    expect(enviar).toHaveBeenCalledTimes(2);
    expect(enviar.mock.calls[1]?.[0].id).toBe(enviar.mock.calls[0]?.[0].id);
  });

  it("Esc fecha e o campo de nome limita 40 caracteres", async () => {
    const u = userEvent.setup();
    const { onFechar } = montar();
    const nome = screen.getByLabelText("Nome do cliente");
    expect(nome).toHaveAttribute("maxlength", "40");
    expect(nome).toHaveAttribute("autocomplete", "off");
    await u.keyboard("{Escape}");
    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});
