import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePainel } from "@/hooks/usePainel";

const roteador = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => roteador }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("usePainel", () => {
  it("servidor que não responde: liga Sem conexão no tempo limite e a busca periódica continua", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, rejeitar) => {
          init?.signal?.addEventListener("abort", () => rejeitar(init.signal?.reason));
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePainel());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.semConexao).toBe(false);

    await act(() => vi.advanceTimersByTimeAsync(8000));
    expect(result.current.semConexao).toBe(true);

    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(roteador.replace).not.toHaveBeenCalled();
  });
});
