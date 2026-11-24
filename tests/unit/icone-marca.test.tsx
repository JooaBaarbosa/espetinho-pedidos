import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IconeMarca } from "@/components/IconeMarca";

describe("IconeMarca", () => {
  it("aplica mask-image, cor atual e tamanho", () => {
    const { container } = render(<IconeMarca nome="chama" tamanho={32} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.tagName).toBe("SPAN");
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.style.width).toBe("32px");
    expect(el.style.height).toBe("32px");
    expect(el.style.backgroundColor).toBe("currentcolor");
    expect(el.getAttribute("style")).toContain("/marca/chama.png");
  });

  it("usa 24px por padrao", () => {
    const { container } = render(<IconeMarca nome="espeto" />);
    expect((container.firstElementChild as HTMLElement).style.width).toBe("24px");
  });
});
