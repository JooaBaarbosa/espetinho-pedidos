import Image from "next/image";
import { FormEntrar } from "@/components/FormEntrar";
import { Rodape } from "@/components/Rodape";
import styles from "./entrar.module.css";

export const metadata = { title: "Entrar | Brasamiga" };

export default function PaginaEntrar() {
  return (
    <div className={styles.pagina}>
      <main className={styles.principal}>
        <Image
          src="/marca/logo-escuro.png"
          alt="Brasamiga"
          width={480}
          height={287}
          priority
          className={styles.logo}
        />
        <h1 className={styles.titulo}>Pedidos do carrinho Brasamiga</h1>
        <FormEntrar />
      </main>
      <Rodape />
    </div>
  );
}
