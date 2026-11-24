"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CartaoPedido } from "./CartaoPedido";
import { FaixaConexao } from "./FaixaConexao";
import { Finalizados } from "./Finalizados";
import { IconeMarca } from "./IconeMarca";
import { Topo } from "./Topo";
import { usePainel } from "@/hooks/usePainel";
import { executarAcao, SessaoExpirada } from "@/lib/api";
import { estaAtrasado } from "@/lib/regras";
import type { Acao, Pedido } from "@/lib/tipos";
import styles from "./Painel.module.css";

type Aba = "preparacao" | "espera" | "finalizados";

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "preparacao", rotulo: "Preparação" },
  { id: "espera", rotulo: "Espera" },
  { id: "finalizados", rotulo: "Finalizados" },
];

export function Painel() {
  const router = useRouter();
  const { dados, agora, semConexao, recarregar } = usePainel();
  const [, setNovoAberto] = useState(false);
  const [aba, setAba] = useState<Aba>("preparacao");

  const ativos = dados?.ativos ?? [];
  const preparacao = ativos.filter((p) => p.status === "preparacao");
  const espera = ativos.filter((p) => p.status === "espera");
  const finalizados = dados?.finalizadosHoje ?? [];
  const tempoMaxMin = dados?.tempoMaxMin ?? 0;
  const contarAtrasados = (lista: Pedido[]) =>
    dados ? lista.filter((p) => estaAtrasado(p, agora, tempoMaxMin)).length : 0;

  const quantidades: Record<Aba, number> = {
    preparacao: preparacao.length,
    espera: espera.length,
    finalizados: finalizados.length,
  };

  async function agir(id: string, acao: Acao) {
    try {
      await executarAcao(id, acao);
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        router.replace("/entrar");
        return;
      }
      // Rede ou pedido inexistente: a recarga abaixo mostra o estado real (ou a faixa sem conexão).
    }
    await recarregar();
  }

  function cartoes(lista: Pedido[], vazio: string): ReactNode {
    if (lista.length === 0) {
      return (
        <div className={styles.vazio}>
          <IconeMarca nome="espeto" tamanho={40} />
          <p>{vazio}</p>
        </div>
      );
    }
    return (
      <ul className={styles.cartoes}>
        {lista.map((p) => (
          <li key={p.id}>
            <CartaoPedido
              pedido={p}
              agora={agora}
              tempoMaxMin={tempoMaxMin}
              onAcao={(acao) => agir(p.id, acao)}
            />
          </li>
        ))}
      </ul>
    );
  }

  function classeSecao(id: Aba, extra?: string): string {
    return [styles.secao, extra, aba === id && styles.ativa].filter(Boolean).join(" ");
  }

  return (
    <>
      <Topo
        contadores={dados?.contadores ?? null}
        atrasadosPreparacao={contarAtrasados(preparacao)}
        atrasadosEspera={contarAtrasados(espera)}
        onNovoPedido={() => setNovoAberto(true)}
      />
      <FaixaConexao semConexao={semConexao} />

      {dados === null ? (
        <main className={styles.carregando}>
          <p>Carregando pedidos</p>
        </main>
      ) : (
        <main className={styles.painel}>
          <div role="tablist" aria-label="Situação dos pedidos" className={styles.abas}>
            {ABAS.map(({ id, rotulo }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`aba-${id}`}
                aria-selected={aba === id}
                aria-controls={`secao-${id}`}
                className={styles.aba}
                onClick={() => setAba(id)}
              >
                {rotulo}
                <span className={styles.abaQtd}>{quantidades[id]}</span>
              </button>
            ))}
          </div>

          <section
            id="secao-preparacao"
            role="tabpanel"
            aria-labelledby="titulo-preparacao"
            className={classeSecao("preparacao")}
          >
            <h2 id="titulo-preparacao" className={styles.tituloSecao}>
              <IconeMarca nome="churrasqueira" tamanho={26} />
              Preparação
            </h2>
            {cartoes(preparacao, "Nenhum pedido em preparação")}
          </section>

          <section
            id="secao-espera"
            role="tabpanel"
            aria-labelledby="titulo-espera"
            className={classeSecao("espera")}
          >
            <h2 id="titulo-espera" className={styles.tituloSecao}>
              Espera
            </h2>
            {cartoes(espera, "Nenhum pedido em espera")}
          </section>

          <section
            id="secao-finalizados"
            role="tabpanel"
            aria-labelledby="titulo-finalizados"
            className={classeSecao("finalizados", styles.finalizados)}
          >
            <h2 id="titulo-finalizados" className={styles.tituloSecao}>
              Finalizados hoje
            </h2>
            <Finalizados pedidos={finalizados} />
          </section>
        </main>
      )}
    </>
  );
}
