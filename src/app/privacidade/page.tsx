import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Rodape } from "@/components/Rodape";
import styles from "../legal.module.css";

export const metadata = { title: "Privacidade | Brasamiga" };

export default function Privacidade() {
  return (
    <div className={styles.pagina}>
      <main className={styles.principal}>
        <Link href="/" className={styles.voltar}>
          <ArrowLeft aria-hidden="true" size={20} />
          Voltar
        </Link>
        <h1 className={styles.titulo}>Privacidade</h1>
        <p className={styles.data}>Atualizado em 27/11/2026</p>

        <h2>O que guardamos</h2>
        <p>
          Este app guarda o nome do cliente e os itens de cada pedido. Usamos esses dados só para o
          controle interno do carrinho Brasamiga: saber o que está em preparo, o que está pronto e o
          que já foi entregue.
        </p>

        <h2>Compartilhamento</h2>
        <p>Não compartilhamos esses dados com terceiros.</p>

        <h2>Cookie e rastreamento</h2>
        <p>
          Usamos um único cookie, o de sessão, que mantém este aparelho conectado depois da senha.
          Não usamos cookies de publicidade nem ferramentas de rastreamento.
        </p>

        <h2>Onde ficam os dados</h2>
        <p>O app roda na Vercel e os dados ficam em um banco de dados na Neon.</p>

        <h2>Contato</h2>
        <p>Dúvidas ou pedidos sobre seus dados: WhatsApp 11 99343-3998.</p>
      </main>
      <Rodape />
    </div>
  );
}
