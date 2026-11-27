"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { IconeMarca } from "./IconeMarca";
import { SeletorQuantidade } from "./SeletorQuantidade";
import { ErroApi } from "@/lib/api";
import { gerarId } from "@/lib/uuid";
import type { NovoPedido } from "@/lib/regras";
import type { Sabor } from "@/lib/tipos";
import styles from "./FormNovoPedido.module.css";

type Props = {
  sabores: Sabor[];
  enviar: (pedido: NovoPedido) => Promise<unknown>;
  onConcluido: () => void;
  onFechar: () => void;
  /** Pede ao painel a lista de sabores de novo (depois de uma recusa 400). */
  onRecarregarSabores: () => void;
};

const AVISO_CONEXAO = "Não foi possível anotar. Verifique a conexão.";

export function FormNovoPedido({ sabores, enviar, onConcluido, onFechar, onRecarregarSabores }: Props) {
  const [id, setId] = useState(gerarId);
  const [cliente, setCliente] = useState("");
  const [quantidades, setQuantidades] = useState<Record<number, number>>({});
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  /** Recusa 400 (ex.: sabor desativado em outro aparelho): oferece atualizar a lista. */
  const [oferecerAtualizar, setOferecerAtualizar] = useState(false);
  const emEnvio = useRef(false);
  const nomeRef = useRef<HTMLInputElement>(null);
  const onFecharRef = useRef(onFechar);

  useEffect(() => {
    onFecharRef.current = onFechar;
  });

  useEffect(() => {
    nomeRef.current?.focus();
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape" && !emEnvio.current) onFecharRef.current();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, []);

  const itens = sabores
    .filter((s) => quantidades[s.id] !== undefined)
    .map((s) => ({ saborId: s.id, quantidade: quantidades[s.id] as number }));
  const total = itens.reduce((soma, i) => soma + i.quantidade, 0);
  const nome = cliente.trim();
  const podeAnotar = nome !== "" && itens.length > 0 && !enviando;

  function fechar() {
    if (!emEnvio.current) onFechar();
  }

  /** Toque fora só fecha se não há nada digitado para perder. */
  function aoTocarFundo() {
    if (cliente === "" && itens.length === 0) fechar();
  }

  function atualizarSabores() {
    setErro(null);
    setOferecerAtualizar(false);
    onRecarregarSabores();
  }

  function alternar(saborId: number, marcado: boolean) {
    setQuantidades((atual) => {
      if (marcado) return { ...atual, [saborId]: 1 };
      const resto = { ...atual };
      delete resto[saborId];
      return resto;
    });
  }

  async function anotar(e?: FormEvent) {
    e?.preventDefault();
    if (emEnvio.current || nome === "" || itens.length === 0) return;
    emEnvio.current = true;
    setEnviando(true);
    setErro(null);
    setOferecerAtualizar(false);
    try {
      await enviar({ id, cliente: nome, itens });
    } catch (e) {
      // Recusa do servidor (< 500) traz a própria mensagem; rede, tempo limite e 5xx não.
      const recusa = e instanceof ErroApi && e.status < 500;
      setErro(recusa ? e.message : AVISO_CONEXAO);
      setOferecerAtualizar(recusa && e.status === 400);
      return;
    } finally {
      emEnvio.current = false;
      setEnviando(false);
    }
    setId(gerarId());
    setCliente("");
    setQuantidades({});
    onConcluido();
  }

  return (
    <div className={styles.fundo} onClick={aoTocarFundo}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-novo-pedido"
        className={styles.folha}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={anotar} className={styles.form}>
          <header className={styles.cabeca}>
            <h2 id="titulo-novo-pedido" className={styles.titulo}>
              <IconeMarca nome="espeto" tamanho={28} />
              Novo pedido
            </h2>
            <button type="button" className={styles.fechar} disabled={enviando} onClick={fechar} aria-label="Fechar">
              <X aria-hidden="true" size={22} />
            </button>
          </header>

          <div className={styles.corpo}>
            <label htmlFor="nome-cliente" className={styles.rotulo}>
              Nome do cliente
            </label>
            <input
              id="nome-cliente"
              ref={nomeRef}
              type="text"
              className={styles.campo}
              value={cliente}
              maxLength={40}
              autoComplete="off"
              autoCapitalize="words"
              onChange={(e) => setCliente(e.target.value)}
            />

            <fieldset className={styles.sabores}>
              <legend className={styles.rotulo}>Sabores</legend>
              <ul className={styles.lista}>
                {sabores.map((s) => {
                  const qtd = quantidades[s.id];
                  return (
                    <li key={s.id} className={styles.linha}>
                      <label className={styles.escolha}>
                        <input
                          type="checkbox"
                          className={styles.caixa}
                          checked={qtd !== undefined}
                          onChange={(e) => alternar(s.id, e.target.checked)}
                        />
                        <span>{s.nome}</span>
                      </label>
                      {qtd !== undefined && (
                        <SeletorQuantidade
                          rotulo={s.nome}
                          valor={qtd}
                          min={1}
                          max={50}
                          onChange={(v) => setQuantidades((atual) => ({ ...atual, [s.id]: v }))}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          </div>

          <footer className={styles.rodape}>
            {erro && (
              <p role="alert" className={styles.erro}>
                {erro}
              </p>
            )}
            {total > 0 && (
              <p className={styles.total}>Total: {total === 1 ? "1 espetinho" : `${total} espetinhos`}</p>
            )}
            <div className={styles.acoes}>
              {oferecerAtualizar && (
                <button type="button" className={styles.secundario} disabled={enviando} onClick={atualizarSabores}>
                  Atualizar sabores
                </button>
              )}
              {erro && (
                <button type="button" className={styles.secundario} disabled={!podeAnotar} onClick={() => anotar()}>
                  Tentar de novo
                </button>
              )}
              <button type="submit" className={styles.anotar} disabled={!podeAnotar}>
                Anotar
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
