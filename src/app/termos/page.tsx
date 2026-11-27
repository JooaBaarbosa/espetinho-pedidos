import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Rodape } from "@/components/Rodape";
import styles from "../legal.module.css";

export const metadata = { title: "Termos | Brasamiga" };

export default function Termos() {
  return (
    <div className={styles.pagina}>
      <main className={styles.principal}>
        <Link href="/" className={styles.voltar}>
          <ArrowLeft aria-hidden="true" size={20} />
          Voltar
        </Link>
        <h1 className={styles.titulo}>Termos</h1>
        <p className={styles.data}>Atualizado em 27/11/2026</p>

        <h2>Para que serve</h2>
        <p>
          Este app é uma ferramenta interna da equipe do carrinho Brasamiga, para anotar e
          acompanhar pedidos. Não é um serviço aberto ao público.
        </p>

        <h2>Acesso</h2>
        <p>
          O acesso é feito por senha, que fica com a equipe. Quem tem a senha deve usá-la só para o
          trabalho no carrinho e não passá-la a outras pessoas.
        </p>

        <h2>Disponibilidade</h2>
        <p>
          Não garantimos que o app estará sempre disponível. Pode haver instabilidade ou paradas
          sem aviso. Por isso, mantenha um jeito de anotar pedidos à mão.
        </p>

        <h2>Mudanças</h2>
        <p>
          O responsável pelo app pode alterar estes termos quando precisar. A data no topo mostra a
          última atualização.
        </p>

        <h2>Contato</h2>
        <p>WhatsApp 11 99343-3998.</p>
      </main>
      <Rodape />
    </div>
  );
}
