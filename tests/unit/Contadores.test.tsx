import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Contadores } from "@/components/Contadores";

const CONTADORES = { preparacao: 3, espera: 5, entregue: 12, cancelado: 1 };

function item(rotulo: string): HTMLElement {
  return screen.getByText(rotulo).closest("li") as HTMLElement;
}

afterEach(cleanup);

describe("Contadores", () => {
  it("renderiza os quatro números com seus rótulos", () => {
    render(<Contadores contadores={CONTADORES} atrasadosPreparacao={0} atrasadosEspera={0} />);
    expect(within(item("Preparação")).getByText("3")).toBeInTheDocument();
    expect(within(item("Espera")).getByText("5")).toBeInTheDocument();
    expect(within(item("Entregue")).getByText("12")).toBeInTheDocument();
    expect(within(item("Cancelado")).getByText("1")).toBeInTheDocument();
    expect(screen.queryByText(/atrasad/)).not.toBeInTheDocument();
  });

  it("com atraso em Preparação, só esse contador ganha a marca de alerta", () => {
    render(<Contadores contadores={CONTADORES} atrasadosPreparacao={1} atrasadosEspera={0} />);
    const prep = item("Preparação");
    expect(prep).toHaveAttribute("data-alerta", "true");
    expect(within(prep).getByText("1 atrasado")).toBeInTheDocument();
    expect(item("Espera")).not.toHaveAttribute("data-alerta");
  });
});
