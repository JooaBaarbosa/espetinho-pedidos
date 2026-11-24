import Image from "next/image";
import Link from "next/link";
import { Settings } from "lucide-react";
import { Contadores } from "./Contadores";
import { IconeMarca } from "./IconeMarca";
import type { Contadores as ContadoresDados } from "@/lib/tipos";
import styles from "./Topo.module.css";

type Props = {
  contadores: ContadoresDados | null;
  atrasadosPreparacao: number;
  atrasadosEspera: number;
  onNovoPedido: () => void;
};

export function Topo({ contadores, atrasadosPreparacao, atrasadosEspera, onNovoPedido }: Props) {
  return (
    <header className={styles.topo}>
      <div className={styles.marca}>
        <Image
          src="/marca/logo-branco.png"
          alt="Brasamiga"
          width={320}
          height={192}
          priority
          className={styles.logo}
        />
        <h1 className={styles.titulo}>PEDIDOS</h1>
      </div>
      <div className={styles.botoes}>
        <button type="button" className={styles.novo} onClick={onNovoPedido}>
          <IconeMarca nome="espeto" tamanho={22} />
          Novo pedido
        </button>
        <Link href="/configuracoes" className={styles.config}>
          <Settings aria-hidden="true" size={22} />
          <span className={styles.configTexto}>Configurações</span>
        </Link>
      </div>
      {contadores && (
        <div className={styles.contadores}>
          <Contadores
            contadores={contadores}
            atrasadosPreparacao={atrasadosPreparacao}
            atrasadosEspera={atrasadosEspera}
          />
        </div>
      )}
    </header>
  );
}
