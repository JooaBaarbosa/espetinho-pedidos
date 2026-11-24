"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { IconeMarca } from "./IconeMarca";
import { SeletorQuantidade } from "./SeletorQuantidade";
import type { NovoPedido } from "@/lib/regras";
import type { Sabor } from "@/lib/tipos";
import styles from "./FormNovoPedido.module.css";

type Props = {
  sabores: Sabor[];
  enviar: (pedido: NovoPedido) => Promise<unknown>;
  onConcluido: () => void;
  onFechar: () => void;
};

export function FormNovoPedido({ sabores, enviar, onConcluido, onFechar }: Props) {
  const [id, setId] = useState(() => crypto.randomUUID());
  const [cliente, setCliente] = useState("");
  const [quantidades, setQuantidades] = useState<Record<number, number>>({});
  const [enviando, setEnviando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const emEnvio = useRef(false);
  const nomeRef = useRef<HTMLInputElement>(null);
  const onFecharRef = useRef(onFechar);

  useEffect(() => {
    onFecharRef.current = onFechar;
  });

  useEffect(() => {
    nomeRef.current?.focus();
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFecharRef.current();
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
    setFalhou(false);
    try {
      await enviar({ id, cliente: nome, itens });
    } catch {
      setFalhou(true);
      return;
    } finally {
      emEnvio.current = false;
      setEnviando(false);
    }
    setId(crypto.randomUUID());
    setCliente("");
    setQuantidades({});
    onConcluido();
  }

  return (
    <div className={styles.fundo} onClick={onFechar}>
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
            <button type="button" className={styles.fechar} onClick={onFechar} aria-label="Fechar">
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
            {falhou && (
              <p role="alert" className={styles.erro}>
                Não foi possível anotar. Verifique a conexão.
              </p>
            )}
            {total > 0 && (
              <p className={styles.total}>Total: {total === 1 ? "1 espetinho" : `${total} espetinhos`}</p>
            )}
            <div className={styles.acoes}>
              {falhou && (
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
