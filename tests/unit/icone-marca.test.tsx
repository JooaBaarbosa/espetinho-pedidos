import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IconeMarca } from "@/components/IconeMarca";

describe("IconeMarca", () => {
  it("aplica mask-image, cor atual e tamanho", () => {
    const { container } = render(<IconeMarca nome="chama" tamanho={32} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el).toHaveStyle({ width: "32px", height: "32px" });
    // jsdom não resolve a palavra-chave currentcolor no computed style; confere o estilo inline.
    expect(el.style.backgroundColor).toBe("currentcolor");
    expect(el.getAttribute("style")).toContain("/marca/chama.png");
  });

  it("usa 24px por padrao", () => {
    const { container } = render(<IconeMarca nome="espeto" />);
    expect(container.firstElementChild).toHaveStyle({ width: "24px", height: "24px" });
  });
});
