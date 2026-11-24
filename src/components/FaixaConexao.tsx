import { WifiOff } from "lucide-react";
import styles from "./FaixaConexao.module.css";

/** Região de status sempre presente; o texto só aparece sem conexão, para ser anunciado. */
export function FaixaConexao({ semConexao }: { semConexao: boolean }) {
  return (
    <div role="status" className={semConexao ? styles.faixa : undefined}>
      {semConexao && (
        <>
          <WifiOff aria-hidden="true" size={18} />
          <span>Sem conexão. Tentando de novo.</span>
        </>
      )}
    </div>
  );
}
