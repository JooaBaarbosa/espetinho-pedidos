"use client";

import { useState, type FormEvent } from "react";
import { ErroApi } from "@/lib/api";
import styles from "./EditorSabores.module.css";

type Props = {
  inicial: number;
  salvar: (tempoMaxMin: number) => Promise<void>;
};

export function EditorTempo({ inicial, salvar }: Props) {
  const [valor, setValor] = useState(String(inicial));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    if (salvando) return;
    setSalvo(false);
    const n = Number(valor);
    if (valor.trim() === "" || !Number.isInteger(n) || n < 1 || n > 120) {
      setErro("Informe um número inteiro de 1 a 120");
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      await salvar(n);
      setSalvo(true);
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível salvar. Verifique a conexão.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className={styles.secao} aria-labelledby="titulo-tempo">
      <h2 id="titulo-tempo" className={styles.titulo}>
        Tempo máximo
      </h2>
      <form className={styles.novo} onSubmit={(e) => void aoEnviar(e)}>
        <label htmlFor="tempo-max" className={styles.rotulo}>
          Minutos até o pedido contar como atrasado
        </label>
        <div className={styles.novoLinha}>
          <input
            id="tempo-max"
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            step={1}
            className={styles.campo}
            value={valor}
            onChange={(e) => {
              setValor(e.target.value);
              setSalvo(false);
            }}
          />
          <button type="submit" className={styles.botao} disabled={salvando}>
            Salvar
          </button>
        </div>
        {erro && (
          <p role="alert" className={styles.erro}>
            {erro}
          </p>
        )}
        {salvo && (
          <p role="status" className={styles.ok}>
            Tempo salvo
          </p>
        )}
      </form>
    </section>
  );
}
