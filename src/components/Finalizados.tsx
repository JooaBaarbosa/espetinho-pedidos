import { formatarCronometro, resumoItens } from "@/lib/regras";
import type { Pedido } from "@/lib/tipos";
import styles from "./Finalizados.module.css";

function tempoTotal(p: Pedido): string {
  if (!p.finalizadoEm) return "";
  return formatarCronometro(new Date(p.finalizadoEm).getTime() - new Date(p.criadoEm).getTime());
}

/** Entregues e cancelados de hoje, na ordem da API (mais recente primeiro). Sem ações. */
export function Finalizados({ pedidos }: { pedidos: Pedido[] }) {
  if (pedidos.length === 0) {
    return <p className={styles.vazio}>Nenhum pedido finalizado hoje</p>;
  }
  return (
    <ul className={styles.lista}>
      {pedidos.map((p) => {
        const entregue = p.status === "entregue";
        return (
          <li key={p.id} className={styles.item}>
            <div className={styles.linha}>
              <span className={styles.cliente}>{p.cliente.toLocaleUpperCase("pt-BR")}</span>
              <span className={entregue ? styles.entregue : styles.cancelado}>
                {entregue ? "Entregue" : "Cancelado"}
              </span>
            </div>
            <div className={styles.linha}>
              <span className={styles.resumo}>{resumoItens(p.itens)}</span>
              <span className={styles.tempo}>
                <span className={styles.rotuloTempo}>Tempo total </span>
                {tempoTotal(p)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
