import { Minus, Plus } from "lucide-react";
import styles from "./SeletorQuantidade.module.css";

type Props = {
  valor: number;
  min?: number;
  max?: number;
  onChange: (valor: number) => void;
  /** Nome do que está sendo contado, usado nos rótulos dos botões (ex.: "Carne"). */
  rotulo: string;
};

export function SeletorQuantidade({ valor, min = 1, max = 50, onChange, rotulo }: Props) {
  return (
    <div className={styles.seletor}>
      <button
        type="button"
        className={styles.botao}
        aria-label={`Diminuir ${rotulo}`}
        disabled={valor <= min}
        onClick={() => onChange(Math.max(min, valor - 1))}
      >
        <Minus aria-hidden="true" size={20} />
      </button>
      <span className={styles.valor} aria-live="polite">
        {valor}
      </span>
      <button
        type="button"
        className={styles.botao}
        aria-label={`Aumentar ${rotulo}`}
        disabled={valor >= max}
        onClick={() => onChange(Math.min(max, valor + 1))}
      >
        <Plus aria-hidden="true" size={20} />
      </button>
    </div>
  );
}
