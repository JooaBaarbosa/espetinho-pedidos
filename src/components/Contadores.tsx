import { IconeMarca } from "./IconeMarca";
import type { Contadores as ContadoresDados } from "@/lib/tipos";
import styles from "./Contadores.module.css";

type Props = {
  contadores: ContadoresDados;
  atrasadosPreparacao: number;
  atrasadosEspera: number;
};

const ITENS: { chave: keyof ContadoresDados; rotulo: string }[] = [
  { chave: "preparacao", rotulo: "Preparação" },
  { chave: "espera", rotulo: "Espera" },
  { chave: "entregue", rotulo: "Entregue" },
  { chave: "cancelado", rotulo: "Cancelado" },
];

export function Contadores({ contadores, atrasadosPreparacao, atrasadosEspera }: Props) {
  const atrasados: Partial<Record<keyof ContadoresDados, number>> = {
    preparacao: atrasadosPreparacao,
    espera: atrasadosEspera,
  };

  return (
    <ul className={styles.contadores} aria-label="Resumo dos pedidos">
      {ITENS.map(({ chave, rotulo }) => {
        const qtdAtrasados = atrasados[chave] ?? 0;
        const alerta = qtdAtrasados > 0;
        return (
          <li
            key={chave}
            className={alerta ? `${styles.contador} ${styles.alerta}` : styles.contador}
            data-alerta={alerta ? "true" : undefined}
          >
            <span className={styles.rotulo}>
              {chave === "preparacao" && <IconeMarca nome="churrasqueira" tamanho={14} />}
              {rotulo}
            </span>
            <span className={styles.numero}>{contadores[chave]}</span>
            {alerta && (
              <span className={styles.atraso}>
                <IconeMarca nome="chama" tamanho={14} />
                <span>
                  {qtdAtrasados} {qtdAtrasados === 1 ? "atrasado" : "atrasados"}
                </span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
