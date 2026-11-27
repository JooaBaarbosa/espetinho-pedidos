import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { EditorSabores } from "@/components/EditorSabores";
import { ErroApi } from "@/lib/api";
import type { Sabor } from "@/lib/tipos";

const SABORES: Sabor[] = [
  { id: 10, nome: "Carne", ativo: true, ordem: 1 },
  { id: 11, nome: "Frango", ativo: true, ordem: 2 },
  { id: 12, nome: "Coração", ativo: false, ordem: 3 },
];

afterEach(cleanup);

type Criar = (nome: string) => Promise<unknown>;
type Editar = (id: number, campos: Partial<Pick<Sabor, "nome" | "ativo" | "ordem">>) => Promise<unknown>;

function montar(
  extra: { criar?: Mock<Criar>; editar?: Mock<Editar>; aoMudar?: Mock<() => Promise<void>> } = {},
) {
  const criar = extra.criar ?? vi.fn<Criar>().mockResolvedValue(undefined);
  const editar = extra.editar ?? vi.fn<Editar>().mockResolvedValue(undefined);
  const aoMudar = extra.aoMudar ?? vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  render(<EditorSabores inicial={SABORES} api={{ criar, editar }} aoMudar={aoMudar} />);
  return { criar, editar, aoMudar };
}

describe("EditorSabores", () => {
  it("seta para baixo no primeiro troca as ordens com o vizinho", async () => {
    const u = userEvent.setup();
    const { editar, aoMudar } = montar();
    await u.click(screen.getByRole("button", { name: "Mover Carne para baixo" }));
    expect(editar).toHaveBeenCalledTimes(2);
    expect(editar).toHaveBeenCalledWith(10, { ordem: 2 });
    expect(editar).toHaveBeenCalledWith(11, { ordem: 1 });
    expect(aoMudar).toHaveBeenCalledTimes(1);
  });

  it("primeiro não sobe e último não desce", () => {
    montar();
    expect(screen.getByRole("button", { name: "Mover Carne para cima" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mover Coração para baixo" })).toBeDisabled();
  });

  it("Desativar chama editar com ativo false", async () => {
    const u = userEvent.setup();
    const { editar } = montar();
    await u.click(screen.getByRole("button", { name: "Desativar Carne" }));
    expect(editar).toHaveBeenCalledWith(10, { ativo: false });
  });

  it("Reativar chama editar com ativo true", async () => {
    const u = userEvent.setup();
    const { editar } = montar();
    await u.click(screen.getByRole("button", { name: "Reativar Coração" }));
    expect(editar).toHaveBeenCalledWith(12, { ativo: true });
  });

  it("adicionar nome vazio não chama criar", async () => {
    const u = userEvent.setup();
    const { criar } = montar();
    await u.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(criar).not.toHaveBeenCalled();
  });

  it("adicionar nome chama criar com o nome aparado e limpa o campo", async () => {
    const u = userEvent.setup();
    const { criar } = montar();
    await u.type(screen.getByLabelText("Novo sabor"), "  Queijo ");
    await u.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(criar).toHaveBeenCalledWith("Queijo");
    expect(screen.getByLabelText("Novo sabor")).toHaveValue("");
  });

  it("erro do servidor aparece junto do campo novo sabor", async () => {
    const u = userEvent.setup();
    montar({ criar: vi.fn<Criar>().mockRejectedValue(new ErroApi("Sabor já existe", 400)) });
    await u.type(screen.getByLabelText("Novo sabor"), "Carne");
    await u.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(await screen.findByText("Sabor já existe")).toBeInTheDocument();
  });

  it("troca de ordem com falha na segunda gravação recarrega a lista e mostra o erro", async () => {
    const u = userEvent.setup();
    const editar = vi
      .fn<Editar>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ErroApi("Sabor não encontrado", 404));
    const { aoMudar } = montar({ editar });
    await u.click(screen.getByRole("button", { name: "Mover Carne para baixo" }));
    expect(await screen.findByText("Sabor não encontrado")).toBeInTheDocument();
    expect(aoMudar).toHaveBeenCalledTimes(1);
  });

  it("adicionar com lista que não recarrega limpa o campo e avisa", async () => {
    const u = userEvent.setup();
    const aoMudar = vi.fn<() => Promise<void>>().mockRejectedValue(new TypeError("fetch"));
    const { criar } = montar({ aoMudar });
    await u.type(screen.getByLabelText("Novo sabor"), "Queijo");
    await u.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(await screen.findByText("Salvo, mas não foi possível atualizar a lista.")).toBeInTheDocument();
    expect(screen.queryByText(/Não foi possível salvar/)).not.toBeInTheDocument();
    expect(criar).toHaveBeenCalledWith("Queijo");
    expect(screen.getByLabelText("Novo sabor")).toHaveValue("");
  });

  it("renomear salva o nome novo", async () => {
    const u = userEvent.setup();
    const { editar } = montar();
    await u.click(screen.getByRole("button", { name: "Renomear Carne" }));
    const campo = screen.getByLabelText("Nome do sabor");
    await u.clear(campo);
    await u.type(campo, "Carne bovina");
    await u.click(screen.getByRole("button", { name: "Salvar nome" }));
    expect(editar).toHaveBeenCalledWith(10, { nome: "Carne bovina" });
  });
});
