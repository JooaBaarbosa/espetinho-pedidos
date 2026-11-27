"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { buscarPainel, SessaoExpirada } from "@/lib/api";
import { criarRelogio } from "@/lib/relogio";
import type { PainelResposta } from "@/lib/tipos";

const INTERVALO_BUSCA_MS = 3000;
const INTERVALO_RELOGIO_MS = 1000;

type Relogio = (localAgora?: number) => Date;

export function usePainel(): {
  dados: PainelResposta | null;
  agora: Date;
  semConexao: boolean;
  recarregar: () => Promise<void>;
} {
  const [dados, setDados] = useState<PainelResposta | null>(null);
  const [agora, setAgora] = useState(() => new Date());
  const [semConexao, setSemConexao] = useState(false);
  const router = useRouter();
  const recarregarAtual = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let ativo = true;
    let relogio: Relogio | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let emVoo: Promise<void> | null = null;
    let deNovo = false;
    /** Sessão expirada: para de buscar de vez e redireciona uma única vez. */
    let encerrado = false;

    async function buscarUmaVez() {
      try {
        const resposta = await buscarPainel();
        if (!ativo) return;
        relogio = criarRelogio(resposta.agora, performance.now());
        setDados(resposta);
        setAgora(relogio());
        setSemConexao(false);
      } catch (e) {
        if (e instanceof SessaoExpirada) {
          if (!encerrado && ativo) router.replace("/entrar");
          encerrado = true;
          return;
        }
        if (ativo) setSemConexao(true);
      }
    }

    /** Nunca sobrepõe requisições: um pedido de busca durante outra em voo roda logo depois dela. */
    function buscar(): Promise<void> {
      if (emVoo) {
        deNovo = true;
        return emVoo;
      }
      emVoo = (async () => {
        do {
          deNovo = false;
          await buscarUmaVez();
        } while (deNovo && ativo && !encerrado);
      })().finally(() => {
        emVoo = null;
      });
      return emVoo;
    }

    function parar() {
      clearTimeout(timer);
      timer = undefined;
    }

    /** Busca agora e reinicia a contagem de 3 s até a próxima (cadeia de setTimeout). */
    async function ciclo() {
      if (encerrado) return;
      await buscar();
      parar();
      if (ativo && !encerrado && document.visibilityState !== "hidden") {
        timer = setTimeout(() => void ciclo(), INTERVALO_BUSCA_MS);
      }
    }

    function aoMudarVisibilidade() {
      if (document.visibilityState === "hidden") parar();
      else void ciclo();
    }

    recarregarAtual.current = ciclo;
    void ciclo();
    const tique = setInterval(() => {
      setAgora(relogio ? relogio() : new Date());
    }, INTERVALO_RELOGIO_MS);
    document.addEventListener("visibilitychange", aoMudarVisibilidade);

    return () => {
      ativo = false;
      parar();
      clearInterval(tique);
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      recarregarAtual.current = async () => {};
    };
  }, [router]);

  const recarregar = useCallback(() => recarregarAtual.current(), []);

  return { dados, agora, semConexao, recarregar };
}
