"use client";

import { useEffect, useRef, useState } from "react";
import { Check, HandPlatter, X } from "lucide-react";
import { IconeMarca } from "./IconeMarca";
import {
  estaAtrasado,
  formatarCronometro,
  minutosAtraso,
  msDecorridos,
  resumoItens,
  totalEspetinhos,
} from "@/lib/regras";
import type { Acao, Pedido } from "@/lib/tipos";
import styles from "./CartaoPedido.module.css";

type Props = {
  pedido: Pedido;
  agora: Date;
  tempoMaxMin: number;
  onAcao: (acao: Acao) => Promise<void>;
};

export function CartaoPedido({ pedido, agora, tempoMaxMin, onAcao }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const botaoNao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmando) botaoNao.current?.focus();
  }, [confirmando]);

  const atrasado = estaAtrasado(pedido, agora, tempoMaxMin);
  const nome = pedido.cliente.toLocaleUpperCase("pt-BR");
  const emPreparacao = pedido.status === "preparacao";

  async function agir(acao: Acao) {
    setEnviando(true);
    setFalhou(false);
    try {
      await onAcao(acao);
    } catch {
      setFalhou(true);
    } finally {
      setEnviando(false);
      setConfirmando(false);
    }
  }

  const classes = [styles.cartao, pedido.status === "espera" && styles.espera, atrasado && styles.atrasado]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes} aria-busy={enviando}>
      <header className={styles.cabeca}>
        <h3 className={styles.cliente}>{nome}</h3>
        <span className={styles.cronometro}>{formatarCronometro(msDecorridos(pedido.criadoEm, agora))}</span>
      </header>

      {atrasado && (
        <>
          <p className={styles.alerta}>
            <IconeMarca nome="chama" tamanho={22} />
            <span>ATRASADO {minutosAtraso(pedido, agora, tempoMaxMin)} MIN</span>
          </p>
          <span role="alert" className={styles.somenteLeitor}>
            Pedido de {nome} atrasado
          </span>
        </>
      )}

      <p className={styles.itens}>{resumoItens(pedido.itens)}</p>
      <p className={styles.total}>Total: {totalEspetinhos(pedido.itens)}</p>

      {falhou && (
        <p role="alert" className={styles.falha}>
          Não foi possível atualizar. Tente de novo.
        </p>
      )}

      {confirmando ? (
        <div className={styles.confirmacao}>
          <p className={styles.pergunta}>Cancelar pedido de {nome}?</p>
          <div className={styles.acoes}>
            <button
              type="button"
              className={`${styles.botao} ${styles.sim}`}
              disabled={enviando}
              onClick={() => void agir("cancelar")}
            >
              Sim
            </button>
            <button
              type="button"
              ref={botaoNao}
              className={`${styles.botao} ${styles.contorno}`}
              disabled={enviando}
              onClick={() => setConfirmando(false)}
            >
              Não
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.acoes}>
          {emPreparacao ? (
            <button
              type="button"
              className={`${styles.botao} ${styles.pronto}`}
              disabled={enviando}
              onClick={() => void agir("pronto")}
            >
              <Check aria-hidden="true" size={22} strokeWidth={2.5} />
              Pronto
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.botao} ${styles.entregue}`}
              disabled={enviando}
              onClick={() => void agir("entregue")}
            >
              <HandPlatter aria-hidden="true" size={22} strokeWidth={2.25} />
              Entregue
            </button>
          )}
          <button
            type="button"
            className={`${styles.botao} ${styles.contorno}`}
            disabled={enviando}
            onClick={() => setConfirmando(true)}
          >
            <X aria-hidden="true" size={20} strokeWidth={2.5} />
            Cancelar
          </button>
        </div>
      )}
    </article>
  );
}
