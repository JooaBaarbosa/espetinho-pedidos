import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormEntrar } from "@/components/FormEntrar";

const roteador = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => roteador }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FormEntrar", () => {
  it("senha em foco, do tipo password", () => {
    render(<FormEntrar entrar={vi.fn()} />);
    const campo = screen.getByLabelText("Senha");
    expect(campo).toHaveAttribute("type", "password");
    expect(campo).toHaveAttribute("autocomplete", "current-password");
    expect(campo).toHaveFocus();
  });

  it("entrar resolvendo false mostra Senha incorreta e não navega", async () => {
    const u = userEvent.setup();
    render(<FormEntrar entrar={vi.fn().mockResolvedValue(false)} />);
    await u.type(screen.getByLabelText("Senha"), "errada");
    await u.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Senha incorreta")).toBeInTheDocument();
    expect(roteador.replace).not.toHaveBeenCalled();
  });

  it("sucesso vai para a raiz e atualiza", async () => {
    const u = userEvent.setup();
    const entrar = vi.fn().mockResolvedValue(true);
    render(<FormEntrar entrar={entrar} />);
    await u.type(screen.getByLabelText("Senha"), "dev");
    await u.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(roteador.replace).toHaveBeenCalledWith("/"));
    expect(entrar).toHaveBeenCalledWith("dev");
    expect(roteador.refresh).toHaveBeenCalled();
  });

  it("falha de rede mostra aviso diferente de senha incorreta", async () => {
    const u = userEvent.setup();
    render(<FormEntrar entrar={vi.fn().mockRejectedValue(new TypeError("fetch"))} />);
    await u.type(screen.getByLabelText("Senha"), "dev");
    await u.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Não foi possível entrar. Verifique a conexão.")).toBeInTheDocument();
    expect(screen.queryByText("Senha incorreta")).not.toBeInTheDocument();
  });

  it("desabilita o botão enquanto envia", async () => {
    const u = userEvent.setup();
    let resolver: (v: boolean) => void = () => {};
    const entrar = vi.fn().mockReturnValue(new Promise<boolean>((r) => (resolver = r)));
    render(<FormEntrar entrar={entrar} />);
    await u.type(screen.getByLabelText("Senha"), "dev");
    await u.click(screen.getByRole("button", { name: "Entrar" }));
    expect(screen.getByRole("button", { name: "Entrando" })).toBeDisabled();
    resolver(false);
    expect(await screen.findByText("Senha incorreta")).toBeInTheDocument();
  });
});
